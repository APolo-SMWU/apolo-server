import { toGenerateRequest } from "./ai-generate.mapper";
import { buildInitialPortfolioProfile } from "./portfolio-profile.service";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

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
  mergeRefreshedBlocks,
  normalizeBlocks,
  normalizeGeneratedResponse,
  normalizeSourceLinks,
  normalizeStoredBlocks,
  normalizeStoredBlocksWithChange,
  PORTFOLIO_SCHEMA_VERSION,
  type IdFactory,
} from "./portfolio-content.service";
import {
  onlineCardAiService,
  type OnlineCardAiProvider,
} from "./ai.service";
import { lookupOrganizationLogo } from "./logo-lookup.service";
import { organizationNameOf } from "./users.service";
import { mapUserProfileToPortfolioProfile } from "./portfolio-profile";
import {
  createPortfolioAttachmentKey,
  validatePortfolioAttachment,
  toAiAttachments,
  isDocumentAttachment,
} from "./portfolio-attachment";
import { createPrivateObjectUrl, deletePrivateObject, putPrivateObject } from "./s3.service";
import {
  materializeWorkImages,
  preserveStoredWorkImageKeys,
  unusedWorkImageKeys,
} from "./portfolio-work-image";

export type PortfolioGenerationAttachment = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

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
  createId: IdFactory;
  logoLookup: (organizationName: string) => Promise<string | null>;
  storage: {
    putObject: typeof putPrivateObject;
    deleteObject: typeof deletePrivateObject;
    signUrl: typeof createPrivateObjectUrl;
  };
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
  const createId = overrides.createId ?? randomUUID;
  const logoLookup = overrides.logoLookup ?? lookupOrganizationLogo;
  const storage = overrides.storage ?? {
    putObject: putPrivateObject,
    deleteObject: deletePrivateObject,
    signUrl: createPrivateObjectUrl,
  };

  type OwnedOnlineCardOptions = { backfill?: boolean };

  const getOwnedOnlineCard = async (
    userId: number,
    portfolioId: number,
    options: OwnedOnlineCardOptions = {},
  ): Promise<Portfolio> => {
    const portfolio = await db.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw ownershipError();
    if (options.backfill === false) return portfolio;

    const normalized = normalizeStoredBlocksWithChange(portfolio.blocks, createId);
    const materialized = await materializeWorkImages(normalized.blocks, portfolio.id, { createId });
    const changed = normalized.changed || !isDeepStrictEqual(materialized.blocks, normalized.blocks);
    if (!changed && portfolio.schemaVersion === PORTFOLIO_SCHEMA_VERSION) return portfolio;

    const data: Prisma.PortfolioUpdateInput = {
      schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    };
    if (changed) data.blocks = asJson(materialized.blocks);

    try {
      return await db.portfolio.update({
        where: { id: portfolio.id },
        data,
      });
    } catch (error) {
      await Promise.all(materialized.uploadedKeys.map((key) => deletePrivateObject(key).catch(() => undefined)));
      throw error;
    }
  };

  const createOnlineCard = async (
    userId: number,
    input: CreatePortfolioInput,
    attachments: PortfolioGenerationAttachment[] = [],
  ): Promise<Portfolio> => {
    attachments.forEach((file) => validatePortfolioAttachment(file, attachments.length));
    if (!input.externalLinks.length && !attachments.some((file) => isDocumentAttachment(file.mimetype))) {
      throw new AppError(400, "외부 링크 또는 PDF·Word 문서를 하나 이상 추가해주세요.", "SOURCE_REQUIRED");
    }
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
        organizationAddress: true,
      },
    });
    if (!user) {
      throw new AppError(404, "사용자를 찾을 수 없습니다.", "NOT_FOUND");
    }

    const sourceLinks = normalizeSourceLinks(input.externalLinks);
    const userType = mapUserType(user.role);
    const { card, profile } = buildInitialPortfolioProfile(user);

    const uploadedKeys: string[] = [];
    let portfolio: Portfolio | undefined;
    try {
      // 포트폴리오 생성 전에도 원본을 참조할 수 있도록 요청별 UUID 저장 경로를 사용한다.
      const attachmentRef = attachments.length ? createId() : "";
      const attachmentData = [];
      for (const file of attachments) {
        const key = createPortfolioAttachmentKey(attachmentRef, file.mimetype);
        await storage.putObject({ key, body: file.buffer, contentType: file.mimetype });
        uploadedKeys.push(key);
        attachmentData.push({
          s3Key: key, originalName: file.originalname, mimeType: file.mimetype, size: file.size,
        });
      }
      const aiAttachments = await toAiAttachments(attachmentData, storage.signUrl);
      const generationRequest = toGenerateRequest(
        user, { ...input, externalLinks: sourceLinks }, aiAttachments,
      );
      const organizationName = organizationNameOf(user);
      const [aiResult, logoUrl] = await Promise.all([
        ai.generate(generationRequest),
        organizationName ? logoLookup(organizationName) : null,
      ]);
      const generated = normalizeGeneratedResponse(aiResult, createId);
      portfolio = await db.portfolio.create({
        data: {
          userId,
          title: input.title,
          userType,
          cardDesignId: input.cardDesignId,
          siteDesignId: input.siteDesignId,
          requirements: input.requirements ?? null,
          card: asJson({ ...card, logoUrl }),
          profile: asJson(profile),
          blocks: asJson(generated.blocks),
          aiMeta: asJson(generated.meta),
          aiWarnings: asJson(generated.warnings),
          sourceLinks: asJson(sourceLinks),
          sourceSnapshots: asJson([]),
          schemaVersion: PORTFOLIO_SCHEMA_VERSION,
          status: "draft",
        },
      });
      const materialized = await materializeWorkImages(generated.blocks, portfolio.id, { createId });
      uploadedKeys.push(...materialized.uploadedKeys);
      await db.portfolio.update({
        where: { id: portfolio.id },
        data: { blocks: asJson(materialized.blocks) },
      });

      if (attachmentData.length > 0) {
        const portfolioId = portfolio.id;
        await db.portfolioAttachment.createMany({
          data: attachmentData.map((file) => ({ ...file, portfolioId })),
        });
      }

      return await db.portfolio.findUniqueOrThrow({
        where: { id: portfolio.id },
        include: {
          attachments: {
            select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
          },
        },
      });
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => storage.deleteObject(key).catch(() => undefined)));
      if (portfolio) await db.portfolio.delete({ where: { id: portfolio.id } }).catch(() => undefined);
      if (error instanceof AppError) throw error;
      throw new AppError(502, "첨부파일 또는 온라인 명함 생성에 실패했습니다.", "PORTFOLIO_GENERATION_FAILED");
    }
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
    const existing = await getOwnedOnlineCard(userId, portfolioId, { backfill: false });
    const data: Prisma.PortfolioUpdateInput = {
      schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    };

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
      const currentBlocks = normalizeStoredBlocks(existing.blocks, createId);
      const incomingBlocks = preserveStoredWorkImageKeys(
        currentBlocks,
        normalizeBlocks(input.blocks, createId),
      );
      const materialized = await materializeWorkImages(incomingBlocks, portfolioId, { createId });
      data.blocks = asJson(materialized.blocks);
      try {
        const updated = await db.portfolio.update({ where: { id: portfolioId }, data });
        await Promise.all(
          unusedWorkImageKeys(currentBlocks, materialized.blocks, portfolioId).map((key) =>
            deletePrivateObject(key).catch((error) => {
              console.error("기존 프로젝트 이미지 삭제에 실패했습니다.", error);
            }),
          ),
        );
        return updated;
      } catch (error) {
        await Promise.all(materialized.uploadedKeys.map((key) => deletePrivateObject(key).catch(() => undefined)));
        throw error;
      }
    } else {
      const { blocks, changed } = normalizeStoredBlocksWithChange(existing.blocks, createId);
      if (changed) data.blocks = asJson(blocks);
    }

    return db.portfolio.update({ where: { id: portfolioId }, data });
  };

  const deleteOnlineCard = async (
    userId: number,
    portfolioId: number,
  ): Promise<void> => {
    const existing = await getOwnedOnlineCard(userId, portfolioId, { backfill: false });
    await db.portfolio.delete({ where: { id: portfolioId } });
    if (existing.cvKey) await deletePrivateObject(existing.cvKey).catch(() => undefined);
  };

  const refreshOnlineCardContent = async (
    userId: number,
    portfolioId: number,
  ): Promise<Portfolio> => {
    const existing = await getOwnedOnlineCard(userId, portfolioId, { backfill: false });
    const sourceLinks = normalizeSourceLinks(existing.sourceLinks);
    const storedAttachments = await db.portfolioAttachment.findMany({ where: { portfolioId } });
    const updated = await ai.updateContent({
      userId,
      sourceLinks,
      requirements: existing.requirements ?? "",
      attachments: await toAiAttachments(storedAttachments, storage.signUrl),
    });
    const normalized = normalizeGeneratedResponse(updated, createId);
    const blocks = mergeRefreshedBlocks(existing.blocks, normalized.blocks, createId);
    const materialized = await materializeWorkImages(blocks, portfolioId, { createId });

    try {
      return await db.portfolio.update({
        where: { id: portfolioId },
        data: {
          blocks: asJson(materialized.blocks),
          aiMeta: asJson(normalized.meta),
          aiWarnings: asJson(normalized.warnings),
          schemaVersion: PORTFOLIO_SCHEMA_VERSION,
        },
      });
    } catch (error) {
      await Promise.all(materialized.uploadedKeys.map((key) => deletePrivateObject(key).catch(() => undefined)));
      throw error;
    }
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
