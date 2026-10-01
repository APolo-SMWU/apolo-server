import type { Portfolio } from "@prisma/client";
import { AppError } from "../../errors/app-error";
import prisma from "../../lib/prisma";
import type { CvData } from "../../types/cv";
import { onlineCardAiService, type OnlineCardAiProvider } from "../ai.service";
import { createPrivateObjectUrl, putPrivateObject } from "../s3.service";
import { buildCvHeader } from "./cv-header";
import { renderCvPdf } from "./cv-pdf";

export const CV_REGENERATE_COOLDOWN_MS = 60_000;
const MAX_REQUIREMENTS = 2_000;

type CvPortfolio = Pick<
  Portfolio,
  "id" | "userId" | "profile" | "card" | "requirements" | "aiMeta" | "cvKey" | "cvGeneratedAt" | "cvKgVersion"
>;

export type CvSaveData = { cvKey: string; cvGeneratedAt: Date; cvKgVersion: number };

export interface CvServiceDependencies {
  findOwnedPortfolio: (userId: number, portfolioId: number) => Promise<CvPortfolio | null>;
  saveCv: (portfolioId: number, data: CvSaveData) => Promise<unknown>;
  generateCv: OnlineCardAiProvider["generateCv"];
  renderPdf: (cv: CvData) => Promise<Buffer>;
  putObject: (input: { key: string; body: Buffer; contentType: string }) => Promise<unknown>;
  signUrl: (key: string) => Promise<string>;
  now: () => Date;
}

export type CvResult = { url: string; generatedAt: Date; regenerated: boolean };
export type CvStatus = { exists: boolean; stale: boolean; generatedAt: Date | null };

export const cvObjectKey = (portfolioId: number) => `portfolios/${portfolioId}/cv/cv.pdf`;

const notFound = () => new AppError(404, "온라인 명함을 찾을 수 없습니다.", "NOT_FOUND");

const latestKgVersion = (aiMeta: unknown): number | null => {
  const version = (aiMeta as { knowledgeGraphVersion?: unknown } | null)?.knowledgeGraphVersion;
  return typeof version === "number" ? version : null;
};

const isStale = (portfolio: CvPortfolio) => {
  const latest = latestKgVersion(portfolio.aiMeta);
  return portfolio.cvKgVersion === null || (latest !== null && portfolio.cvKgVersion < latest);
};

/** 동시에 들어온 작업을 하나씩 순서대로 실행한다. Chromium을 여러 개 띄워 메모리가 넘치는 것을 막는다. */
const serialize = <A, R>(task: (arg: A) => Promise<R>) => {
  let tail: Promise<unknown> = Promise.resolve();
  return (arg: A): Promise<R> => {
    const run = tail.then(() => task(arg));
    tail = run.catch(() => undefined);
    return run;
  };
};

export const createCvService = (overrides: Partial<CvServiceDependencies> = {}) => {
  const deps: CvServiceDependencies = {
    findOwnedPortfolio: (userId, portfolioId) =>
      prisma.portfolio.findFirst({
        where: { id: portfolioId, userId },
        select: {
          id: true,
          userId: true,
          profile: true,
          card: true,
          requirements: true,
          aiMeta: true,
          cvKey: true,
          cvGeneratedAt: true,
          cvKgVersion: true,
        },
      }),
    saveCv: (portfolioId, data) => prisma.portfolio.update({ where: { id: portfolioId }, data }),
    generateCv: (request) => onlineCardAiService.generateCv(request),
    renderPdf: renderCvPdf,
    putObject: putPrivateObject,
    signUrl: createPrivateObjectUrl,
    now: () => new Date(),
    ...overrides,
  };
  const renderPdf = serialize(deps.renderPdf);
  const inFlight = new Map<number, Promise<CvResult>>();

  const getOwned = async (userId: number, portfolioId: number) => {
    const portfolio = await deps.findOwnedPortfolio(userId, portfolioId);
    if (!portfolio) throw notFound();
    return portfolio;
  };

  const generate = async (portfolio: CvPortfolio): Promise<CvResult> => {
    const requirements = portfolio.requirements?.trim().slice(0, MAX_REQUIREMENTS);
    const generated = await deps.generateCv({
      userId: portfolio.userId,
      ...(requirements ? { requirements } : {}),
    });

    if (generated.sections.length === 0) {
      const warnings = Array.isArray(generated.warnings) ? generated.warnings : [];
      const kgMissing = warnings.some((w) => (w as { code?: unknown })?.code === "CV_KG_NOT_FOUND");
      throw kgMissing
        ? new AppError(409, "포트폴리오를 먼저 생성해주세요.", "CV_KG_NOT_READY")
        : new AppError(422, "CV에 넣을 수 있는 항목이 없습니다.", "CV_EMPTY");
    }

    let pdf: Buffer;
    try {
      pdf = await renderPdf({ header: buildCvHeader(portfolio), sections: generated.sections });
    } catch (error) {
      console.error("CV PDF 렌더링 실패", error);
      throw new AppError(500, "CV PDF를 만들지 못했습니다.", "CV_RENDER_FAILED");
    }

    const key = cvObjectKey(portfolio.id);
    try {
      await deps.putObject({ key, body: pdf, contentType: "application/pdf" });
    } catch (error) {
      console.error("CV PDF 저장 실패", error);
      throw new AppError(500, "CV PDF를 저장하지 못했습니다.", "CV_STORAGE_FAILED");
    }

    const generatedAt = deps.now();
    const kgVersion = (generated.meta as { knowledgeGraphVersion: number }).knowledgeGraphVersion;
    await deps.saveCv(portfolio.id, { cvKey: key, cvGeneratedAt: generatedAt, cvKgVersion: kgVersion });
    return { url: await deps.signUrl(key), generatedAt, regenerated: true };
  };

  const getCvStatus = async (userId: number, portfolioId: number): Promise<CvStatus> => {
    const portfolio = await getOwned(userId, portfolioId);
    const exists = portfolio.cvKey !== null;
    return { exists, stale: exists && isStale(portfolio), generatedAt: portfolio.cvGeneratedAt };
  };

  const ensureCv = async (
    userId: number,
    portfolioId: number,
    options: { force?: boolean | undefined } = {},
  ): Promise<CvResult> => {
    const portfolio = await getOwned(userId, portfolioId);
    const pending = inFlight.get(portfolio.id);
    if (pending) return pending;

    const exists = portfolio.cvKey !== null && portfolio.cvGeneratedAt !== null;
    if (exists && !isStale(portfolio) && !options.force) {
      return {
        url: await deps.signUrl(portfolio.cvKey!),
        generatedAt: portfolio.cvGeneratedAt!,
        regenerated: false,
      };
    }
    if (exists && options.force && !isStale(portfolio)) {
      const elapsed = deps.now().getTime() - portfolio.cvGeneratedAt!.getTime();
      if (elapsed < CV_REGENERATE_COOLDOWN_MS) {
        throw new AppError(429, "CV는 1분에 한 번만 다시 생성할 수 있습니다.", "CV_REGENERATE_TOO_SOON");
      }
    }

    const run = generate(portfolio).finally(() => inFlight.delete(portfolio.id));
    inFlight.set(portfolio.id, run);
    return run;
  };

  return { getCvStatus, ensureCv };
};

const service = createCvService();
export const getCvStatus = service.getCvStatus;
export const ensureCv = service.ensureCv;
