import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";

export const getSharedPortfolioByToken = async (shareToken: string) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: {
      shareToken,
      isShared: true,
    },
  });

  if (!portfolio) {
    throw new AppError(404, "공유 포트폴리오를 찾을 수 없습니다.");
  }

  return portfolio;
};
