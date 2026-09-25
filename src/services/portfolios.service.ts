import { toGenerateRequest } from "./ai-generate.mapper";
import { buildInitialPortfolioProfile } from "./portfolio-profile.service";
import { randomUUID } from "node:crypto";

import type { Prisma, Portfolio } from "@prisma/client";
import { mapUserType } from "./ai-profile.mapper";
import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";
import type {
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from "../schemas/portfolio.schema";
import {
  businessCardSchema,
  profileSchema,
} from "../schemas/portfolio.schema";
import {
  defaultSourceFetcher,
  fetchSourceUpdates,
  mergeRefreshedBlocks,
  normalizeBlocks,
  normalizeGeneratedResponse,
  normalizeSourceLinks,
  parseRefreshedBlocks,
  type Clock,
  type IdFactory,
  type SourceFetcher,
} from "./portfolio-content.service";
import {
  onlineCardAiService,
  type OnlineCardAiProvider,
} from "./ai.service";

const summarySelect = {
  id: true,
  title: true,
  userType: true,
  cardDesignId: true,
  siteDesignId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PortfolioSummary = Prisma.PortfolioGetPayload<{
  select: typeof summarySelect;
}>;

interface PortfolioServiceDependencies {
  prisma: typeof prisma;
  ai: OnlineCardAiProvider;
  sourceFetcher: SourceFetcher;
  createId: IdFactory;
  now: Clock;
}

const ownershipError = () =>
  new AppError(404, "온라인 명함을 찾을 수 없습니다.", "NOT_FOUND");

const asJson = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export const createPortfolioService = (
  overrides: Partial<PortfolioServiceDependencies> = {},
) => {
  const db = overrides.prisma ?? prisma;
  const ai = overrides.ai ?? onlineCardAiService;
  const sourceFetcher = overrides.sourceFetcher ?? defaultSourceFetcher;
  const createId = overrides.createId ?? randomUUID;
  const now = overrides.now ?? (() => new Date());

  const getOwnedOnlineCard = async (
    userId: number,
    portfolioId: number,
  ): Promise<Portfolio> => {
    const portfolio = await db.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw ownershipError();
    return portfolio;
  };

  const createOnlineCard = async (
    userId: number,
    input: CreatePortfolioInput,
  ): Promise<Portfolio> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        github: true,
        company: true,
        jobTitle: true,
        tel: true,
        university: true,
        department: true,
        major: true,
      },
    });
    if (!user) {
      throw new AppError(404, "사용자를 찾을 수 없습니다.", "NOT_FOUND");
    }

    const userType = mapUserType(user.role);
    const { card, profile } = buildInitialPortfolioProfile(user);
    const sourceLinks = normalizeSourceLinks(input.externalLinks);
    // 생성 시 외부 소스는 AI가 처리한다. Backend는 링크만 전달한다.
    const generationRequest = toGenerateRequest(user, { ...input, externalLinks: sourceLinks });
    const generated = normalizeGeneratedResponse(
      await ai.generate(generationRequest),
      createId,
    );

    return db.portfolio.create({
      data: {
        userId,
        title: input.title,
        userType,
        cardDesignId: input.cardDesignId,
        siteDesignId: input.siteDesignId,
        card: asJson(card),
        profile: asJson(profile),
        blocks: asJson(generated.blocks),
        aiMeta: asJson(generated.meta),
        aiWarnings: asJson(generated.warnings),
        sourceLinks: asJson(sourceLinks),
        sourceSnapshots: asJson([]),
        schemaVersion: 1,
        status: "draft",
      },
    });
  };

  const getMyOnlineCards = (userId: number): Promise<PortfolioSummary[]> =>
    db.portfolio.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: summarySelect,
    });

  const updateOnlineCard = async (
    userId: number,
    portfolioId: number,
    input: UpdatePortfolioInput,
  ): Promise<Portfolio> => {
    const existing = await getOwnedOnlineCard(userId, portfolioId);
    const data: Prisma.PortfolioUpdateInput = {};

    if (input.title !== undefined) data.title = input.title;
    if (input.cardDesignId !== undefined) data.cardDesignId = input.cardDesignId;
    if (input.siteDesignId !== undefined) data.siteDesignId = input.siteDesignId;
    if (input.card !== undefined) {
      const result = businessCardSchema.safeParse({
        ...(existing.card as object),
        ...input.card,
      });
      if (!result.success) {
        throw new AppError(500, "저장된 명함 형식이 올바르지 않습니다.", "INVALID_PORTFOLIO_DATA");
      }
      data.card = asJson(result.data);
    }
    if (input.profile !== undefined) {
      const result = profileSchema.safeParse({
        ...(existing.profile as object),
        ...input.profile,
      });
      if (!result.success) {
        throw new AppError(500, "저장된 프로필 형식이 올바르지 않습니다.", "INVALID_PORTFOLIO_DATA");
      }
      data.profile = asJson(result.data);
    }
    if (input.blocks !== undefined) {
      data.blocks = asJson(normalizeBlocks(input.blocks, createId));
    }

    return db.portfolio.update({ where: { id: portfolioId }, data });
  };

  const deleteOnlineCard = async (
    userId: number,
    portfolioId: number,
  ): Promise<void> => {
    await getOwnedOnlineCard(userId, portfolioId);
    await db.portfolio.delete({ where: { id: portfolioId } });
  };

  const refreshOnlineCardContent = async (
    userId: number,
    portfolioId: number,
  ): Promise<Portfolio> => {
    const existing = await getOwnedOnlineCard(userId, portfolioId);
    const sourceState = await fetchSourceUpdates(
      existing.sourceLinks,
      existing.sourceSnapshots,
      sourceFetcher,
      now,
    );

    let blocks = normalizeBlocks(existing.blocks, createId);
    if (sourceState.changedSources.length > 0) {
      const refreshed = await ai.refresh({
        portfolio: {
          title: existing.title,
          card: existing.card,
          profile: existing.profile,
          blocks: existing.blocks,
        },
        changedSources: sourceState.changedSources,
      });
      blocks = mergeRefreshedBlocks(
        blocks,
        parseRefreshedBlocks(refreshed),
        createId,
      );
    }

    return db.portfolio.update({
      where: { id: portfolioId },
      data: {
        blocks: asJson(blocks),
        sourceSnapshots: asJson(sourceState.snapshots),
      },
    });
  };

  return {
    createOnlineCard,
    getMyOnlineCards,
    getOwnedOnlineCard,
    updateOnlineCard,
    deleteOnlineCard,
    refreshOnlineCardContent,
  };
};

const service = createPortfolioService();

export const createOnlineCard = service.createOnlineCard;
export const getMyOnlineCards = service.getMyOnlineCards;
export const getOwnedOnlineCard = service.getOwnedOnlineCard;
export const updateOnlineCard = service.updateOnlineCard;
export const deleteOnlineCard = service.deleteOnlineCard;
export const refreshOnlineCardContent = service.refreshOnlineCardContent;
