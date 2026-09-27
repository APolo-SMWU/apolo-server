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
  mergeRefreshedBlocks,
  normalizeBlocks,
  normalizeGeneratedResponse,
  normalizeSourceLinks,
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
} from "./portfolio-attachment";
import { deletePrivateObject, putPrivateObject } from "./s3.service";

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
    attachments: PortfolioGenerationAttachment[] = [],
  ): Promise<Portfolio> => {
    attachments.forEach((file) => validatePortfolioAttachment(file, attachments.length));
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
    const { card, profile } = buildInitialPortfolioProfile(user, sourceLinks);

    const generationRequest = toGenerateRequest(user, { ...input, externalLinks: sourceLinks });
    const organizationName = organizationNameOf(user);
    const [aiResult, logoUrl] = await Promise.all([
      ai.generate(generationRequest),
      organizationName ? logoLookup(organizationName) : null,
    ]);
    const generated = normalizeGeneratedResponse(aiResult, createId);

    const portfolio = await db.portfolio.create({
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
        schemaVersion: 1,
        status: "draft",
      },
    });

    const uploadedKeys: string[] = [];
    try {
      const attachmentData = [];
      for (const file of attachments) {
        const key = createPortfolioAttachmentKey(portfolio.id, file.mimetype);
        await putPrivateObject({ key, body: file.buffer, contentType: file.mimetype });
        uploadedKeys.push(key);
        attachmentData.push({
          portfolioId: portfolio.id,
          s3Key: key,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });
      }

      if (attachmentData.length > 0) {
        await db.portfolioAttachment.createMany({ data: attachmentData });
      }

      return db.portfolio.findUniqueOrThrow({
        where: { id: portfolio.id },
        include: {
          attachments: {
            select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
          },
        },
      });
    } catch (error) {
      await Promise.all(uploadedKeys.map((key) => deletePrivateObject(key).catch(() => undefined)));
      await db.portfolio.delete({ where: { id: portfolio.id } }).catch(() => undefined);
      if (error instanceof AppError) throw error;
      throw new AppError(502, "첨부파일을 저장하지 못했습니다.", "ATTACHMENT_STORAGE_FAILED");
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
    const sourceLinks = normalizeSourceLinks(existing.sourceLinks);
    const updated = await ai.updateContent({
      userId,
      sourceLinks,
      requirements: existing.requirements ?? "",
    });
    const normalized = normalizeGeneratedResponse(updated, createId);
    const blocks = mergeRefreshedBlocks(existing.blocks, updated.blocks, createId);

    return db.portfolio.update({
      where: { id: portfolioId },
      data: {
        blocks: asJson(blocks),
        aiMeta: asJson(normalized.meta),
        aiWarnings: asJson(normalized.warnings),
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
