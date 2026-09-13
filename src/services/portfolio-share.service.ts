import { randomUUID } from "node:crypto";

import type { Portfolio } from "@prisma/client";
import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";
import type { IdFactory } from "./portfolio-content.service";

interface PortfolioShareServiceDependencies {
  prisma: typeof prisma;
  createId: IdFactory;
  publicBaseUrl: string;
}

const missingPortfolio = () =>
  new AppError(404, "온라인 명함을 찾을 수 없습니다.", "NOT_FOUND");

const missingShare = () =>
  new AppError(404, "공유 온라인 명함을 찾을 수 없습니다.", "NOT_FOUND");

export const createPortfolioShareService = (
  overrides: Partial<PortfolioShareServiceDependencies> = {},
) => {
  const db = overrides.prisma ?? prisma;
  const createId = overrides.createId ?? randomUUID;
  const publicBaseUrl =
    overrides.publicBaseUrl ?? process.env.PUBLIC_APP_URL ?? "http://localhost:3000";

  const createShareLink = async (
    userId: number,
    portfolioId: number,
  ): Promise<{ shareId: string; shareUrl: string }> => {
    const portfolio = await db.portfolio.findFirst({
      where: { id: portfolioId, userId },
      select: { id: true },
    });
    if (!portfolio) throw missingPortfolio();

    const shareId = createId();
    await db.portfolioShare.create({ data: { portfolioId, shareId } });

    return {
      shareId,
      shareUrl: new URL(`/share/${encodeURIComponent(shareId)}`, publicBaseUrl).toString(),
    };
  };

  const getSharedOnlineCard = async (shareId: string): Promise<Portfolio> => {
    const share = await db.portfolioShare.findUnique({
      where: { shareId },
      include: { portfolio: true },
    });
    if (!share) throw missingShare();
    return share.portfolio;
  };

  return { createShareLink, getSharedOnlineCard };
};

const service = createPortfolioShareService();

export const createShareLink = service.createShareLink;
export const getSharedOnlineCard = service.getSharedOnlineCard;
