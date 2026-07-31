import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";

// 공개 포트폴리오 목록 조회
export const getPublicPortfolios = async () => {
  const portfolios = await prisma.portfolio.findMany({
    where: {
      isPublic: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return portfolios;
};

// 공개 포트폴리오 상세 조회
export const getPublicPortfolioById = async (portfolioId: number) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: {
      id: portfolioId,
      isPublic: true,
    },
  });

  if (!portfolio) {
    throw new AppError(404, "공개 포트폴리오를 찾을 수 없습니다.", "NOT_FOUND");
  }

  return portfolio;
};
