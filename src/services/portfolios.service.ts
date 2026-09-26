import { randomUUID } from "node:crypto";

import type { Prisma, Portfolio, UserType } from "@prisma/client";
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
  normalizeGeneratedDocument,
  normalizeSourceLinks,
  parseRefreshedBlocks,
  type Clock,
  type IdFactory,
  type SourceFetcher,
} from "./portfolio-content.service";
import {
  onlineCardAiService,
  type OnlineCardAiProvider,
  type OnlineCardUserProfile,
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
  sourceFetcher: SourceFetcher;
  createId: IdFactory;
  now: Clock;
  logoLookup: (organizationName: string) => Promise<string | null>;
}

const ownershipError = () =>
  new AppError(404, "온라인 명함을 찾을 수 없습니다.", "NOT_FOUND");

const mapUserType = (role: string | null): UserType => {
  switch (role?.toLocaleLowerCase()) {
    case "student":
      return "student";
    case "professor":
      return "professor";
    case "professional":
      return "professional";
    default:
      throw new AppError(
        422,
        "온라인 명함 생성 전에 사용자 유형을 등록해주세요.",
        "PROFILE_INCOMPLETE",
      );
  }
};

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

    const userType = mapUserType(user.role);
    const sourceLinks = normalizeSourceLinks(input.externalLinks);
    const organizationName = organizationNameOf(user);
    // 명함 로고는 AI가 아니라 Backend가 채우며, 외부 소스 수집과 동시에 조회한다.
    const [sourceState, logoUrl] = await Promise.all([
      fetchSourceUpdates(sourceLinks, [], sourceFetcher, now),
      organizationName ? logoLookup(organizationName) : null,
    ]);
    const { organizationAddress, ...generationUser } = user;
    const generationRequest = {
      user: generationUser as OnlineCardUserProfile,
      sources: sourceState.sources,
      ...(input.requirements === undefined ? {} : { requirements: input.requirements }),
    };
    const generated = normalizeGeneratedDocument(
      await ai.generate(generationRequest),
      createId,
    );

    const portfolio = await db.portfolio.create({
      data: {
        userId,
        title: input.title,
        userType,
        cardDesignId: input.cardDesignId,
        siteDesignId: input.siteDesignId,
        card: asJson({ ...generated.card, organizationAddress, logoUrl }),
        profile: asJson(mapUserProfileToPortfolioProfile(user, generated.profile)),
        blocks: asJson(generated.blocks),
        sourceLinks: asJson(sourceLinks),
        sourceSnapshots: asJson(sourceState.snapshots),
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
