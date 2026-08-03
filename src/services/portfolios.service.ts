import type { Prisma } from "@prisma/client";
import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";
import { randomUUID } from "crypto";

// 포트폴리오 스냅샷 생성
const buildPortfolioSnapshot = (portfolio: {
  title: string;
  jobRole: string;
  careerLevel: string;
  directionPrompt: string;
  externalLinks: Prisma.JsonValue;
  currentContentJson: Prisma.JsonValue;
  isPublic: boolean;
}): Prisma.JsonObject => {
  return {
    title: portfolio.title,
    jobRole: portfolio.jobRole,
    careerLevel: portfolio.careerLevel,
    directionPrompt: portfolio.directionPrompt,
    externalLinks: portfolio.externalLinks,
    currentContentJson: portfolio.currentContentJson,
    isPublic: portfolio.isPublic,
  };
};

// 포트폴리오 생성
export const createPortfolio = async (
  userId: number,
  title: string,
  jobRole: string,
  careerLevel: string,
  directionPrompt: string,
  externalLinks: { label: string; url: string }[],
  currentContentJson: object
) => {
  const result = await prisma.$transaction(async (tx) => {
    const portfolio = await tx.portfolio.create({
      data: {
        userId,
        title,
        jobRole,
        careerLevel,
        directionPrompt,
        externalLinks,
        currentContentJson,
      },
    });

    await tx.portfolioVersion.create({
      data: {
        portfolioId: portfolio.id,
        versionNumber: 1,
        contentJson: buildPortfolioSnapshot(portfolio),
        changeType: "INITIAL_GENERATION",
        changePrompt: null,
      },
    });

    return portfolio;
  });

  return result;
};

// 내 포트폴리오 조회
export const getMyPortfolios = async (userId: number) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return portfolios;
};

// 포트폴리오 상세 조회
export const getPortfolioById = async (
  userId: number,
  portfolioId: number
) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      userId,
    },
  });

  if (!portfolio) {
    throw new AppError(404, "포트폴리오를 찾을 수 없습니다.", "NOT_FOUND");
  }

  return portfolio;
};

// 포트폴리오 수정
export const updatePortfolio = async (
  userId: number,
  portfolioId: number,
  title?: string,
  jobRole?: string,
  careerLevel?: string,
  directionPrompt?: string,
  externalLinks?: { label: string; url: string }[],
  currentContentJson?: object
) => {
  const existingPortfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      userId,
    },
  });

  if (!existingPortfolio) {
    throw new AppError(404, "수정할 포트폴리오를 찾을 수 없습니다.", "NOT_FOUND");
  }

  const data: {
    title?: string;
    jobRole?: string;
    careerLevel?: string;
    directionPrompt?: string;
    externalLinks?: { label: string; url: string }[];
    currentContentJson?: object;
  } = {};

  if (title !== undefined) data.title = title;
  if (jobRole !== undefined) data.jobRole = jobRole;
  if (careerLevel !== undefined) data.careerLevel = careerLevel;
  if (directionPrompt !== undefined) data.directionPrompt = directionPrompt;
  if (externalLinks !== undefined) data.externalLinks = externalLinks;
  if (currentContentJson !== undefined) data.currentContentJson = currentContentJson;

  const result = await prisma.$transaction(async (tx) => {
    const updatedPortfolio = await tx.portfolio.update({
      where: { id: portfolioId },
      data,
    });

    const latestVersion = await tx.portfolioVersion.findFirst({
      where: { portfolioId },
      orderBy: { versionNumber: "desc" },
    });

    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    await tx.portfolioVersion.create({
      data: {
        portfolioId: updatedPortfolio.id,
        versionNumber: nextVersionNumber,
        contentJson: buildPortfolioSnapshot(updatedPortfolio),
        changeType: "MANUAL_EDIT",
        changePrompt: null,
      },
    });

    return updatedPortfolio;
  });

  return result;
};

//포트폴리오 공개 여부 수정
export const updatePortfolioVisibility = async (
  userId: number,
  portfolioId: number,
  isPublic: boolean
) => {
  const existingPortfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      userId,
    },
  });

  if (!existingPortfolio) {
    throw new AppError(404, "수정할 포트폴리오를 찾을 수 없습니다.", "NOT_FOUND");
  }

  const updatedPortfolio = await prisma.portfolio.update({
    where: {
      id: portfolioId,
    },
    data: {
      isPublic,
    },
  });

  return updatedPortfolio;
};

export const updatePortfolioShare = async (
  userId: number,
  portfolioId: number,
  isShared: boolean
) => {
  const existingPortfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      userId,
    },
  });

  if (!existingPortfolio) {
    throw new AppError(404, "수정할 포트폴리오를 찾을 수 없습니다.", "NOT_FOUND");
  }

  const updatedPortfolio = await prisma.portfolio.update({
    where: {
      id: portfolioId,
    },
    data: {
      isShared,
      shareToken: isShared ? randomUUID() : null,
      sharedAt: isShared ? new Date() : null,
    },
  });

  return updatedPortfolio;
};
