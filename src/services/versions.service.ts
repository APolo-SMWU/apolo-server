import prisma from "../lib/prisma";

// 내 포트폴리오 버전 목록 조회
export const getPortfolioVersions = async (
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
    throw new Error("포트폴리오를 찾을 수 없습니다.");
  }

  const versions = await prisma.portfolioVersion.findMany({
    where: {
      portfolioId,
    },
    orderBy: {
      versionNumber: "desc",
    },
  });

  return versions;
};

// 특정 버전 상세 조회
export const getPortfolioVersionById = async (
  userId: number,
  portfolioId: number,
  versionId: number
) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      userId,
    },
  });

  if (!portfolio) {
    throw new Error("포트폴리오를 찾을 수 없습니다.");
  }

  const version = await prisma.portfolioVersion.findFirst({
    where: {
      id: versionId,
      portfolioId,
    },
  });

  if (!version) {
    throw new Error("버전 정보를 찾을 수 없습니다.");
  }

  return version;
};