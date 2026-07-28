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
    throw new Error("수정할 포트폴리오를 찾을 수 없습니다.");
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
  if (currentContentJson !== undefined) {
    data.currentContentJson = currentContentJson;
  }

  const updatedPortfolio = await prisma.portfolio.update({
    where: {
      id: portfolioId,
    },
    data,
  });

  return updatedPortfolio;
};

//포트폴리오 공개여부 수정
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
    throw new Error("수정할 포트폴리오를 찾을 수 없습니다.");
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