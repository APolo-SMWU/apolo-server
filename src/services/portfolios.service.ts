import prisma from "../lib/prisma";

export const createPortfolio = async (
  userId: number,
  title: string,
  jobRole: string,
  careerLevel: string,
  directionPrompt: string,
  externalLinks: { label: string; url: string }[],
  currentContentJson: object
) => {
  const portfolio = await prisma.portfolio.create({
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

  return portfolio;
};

export const getMyPortfolios = async (userId: number) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return portfolios;
};

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
    throw new Error("포트폴리오를 찾을 수 없습니다.");
  }

  return portfolio;
};