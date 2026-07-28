import type { Prisma } from "../generated/prisma/client";
import prisma from "../lib/prisma";

// 버전 테이블에 저장할 스냅샷 만들기
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

// 다음 버전 번호 계산
const getNextVersionNumber = async (tx: Prisma.TransactionClient, portfolioId: number) => {
  const latestVersion = await tx.portfolioVersion.findFirst({
    where: { portfolioId },
    orderBy: { versionNumber: "desc" },
  });

  return latestVersion ? latestVersion.versionNumber + 1 : 1;
};

// AI 초안 생성 mock
export const generatePortfolioWithMock = async (
  userId: number,
  portfolioId: number
) => {
  const existingPortfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      userId,
    },
  });

  if (!existingPortfolio) {
    throw new Error("포트폴리오를 찾을 수 없습니다.");
  }

  const existingInitialVersion = await prisma.portfolioVersion.findFirst({
    where: {
      portfolioId,
      changeType: "INITIAL_GENERATION",
    },
  });

  if (existingInitialVersion) {
    throw new Error("이미 AI 초안이 생성된 포트폴리오입니다.");
  }

  const mockGeneratedContent = {
    blocks: [
      { type: "hero", text: "AI가 생성한 포트폴리오 초안입니다." },
      { type: "about", text: "간단한 자기소개 섹션" },
      { type: "project", text: "대표 프로젝트 섹션" },
    ],
  };

  const result = await prisma.$transaction(async (tx) => {
    const updatedPortfolio = await tx.portfolio.update({
      where: { id: portfolioId },
      data: {
        currentContentJson: mockGeneratedContent,
      },
    });

    const nextVersionNumber = await getNextVersionNumber(tx, portfolioId);

    await tx.portfolioVersion.create({
      data: {
        portfolioId: updatedPortfolio.id,
        versionNumber: nextVersionNumber,
        contentJson: buildPortfolioSnapshot(updatedPortfolio),
        changeType: "INITIAL_GENERATION",
        changePrompt: null,
      },
    });

    return updatedPortfolio;
  });

  return result;
};

// AI 자연어 수정 mock
export const editPortfolioWithMock = async (
  userId: number,
  portfolioId: number,
  prompt: string
) => {
  const existingPortfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      userId,
    },
  });

  if (!existingPortfolio) {
    throw new Error("포트폴리오를 찾을 수 없습니다.");
  }

  const mockEditedContent = {
    ...((existingPortfolio.currentContentJson as Prisma.JsonObject) ?? {}),
    aiEditPrompt: prompt,
    editedAt: new Date().toISOString(),
  };

  const result = await prisma.$transaction(async (tx) => {
    const updatedPortfolio = await tx.portfolio.update({
      where: { id: portfolioId },
      data: {
        currentContentJson: mockEditedContent,
      },
    });

    const nextVersionNumber = await getNextVersionNumber(tx, portfolioId);

    await tx.portfolioVersion.create({
      data: {
        portfolioId: updatedPortfolio.id,
        versionNumber: nextVersionNumber,
        contentJson: buildPortfolioSnapshot(updatedPortfolio),
        changeType: "AI_EDIT",
        changePrompt: prompt,
      },
    });

    return updatedPortfolio;
  });

  return result;
};