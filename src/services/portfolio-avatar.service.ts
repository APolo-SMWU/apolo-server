import type { Prisma, Portfolio } from "@prisma/client";

import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";
import { profileSchema } from "../schemas/portfolio.schema";
import { createPrivateObjectUrl, deletePrivateObject, putPrivateObject } from "./s3.service";
import { createPortfolioAvatarKey, validatePortfolioAvatar } from "./portfolio-avatar";

type AvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const avatarKeyPattern = /^portfolios\/\d+\/avatar\/[0-9a-f-]+\.(?:jpg|png|webp)$/;

const jsonValue = (value: unknown) => value as Prisma.InputJsonValue;

const ownedPortfolio = async (userId: number, portfolioId: number) => {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) throw new AppError(404, "온라인 명함을 찾을 수 없습니다.", "NOT_FOUND");
  return portfolio;
};

export const withSignedAvatarUrl = async (portfolio: Portfolio) => {
  const profile = profileSchema.parse(portfolio.profile);
  if (!profile.avatarUrl || !avatarKeyPattern.test(profile.avatarUrl)) return portfolio;

  return {
    ...portfolio,
    profile: {
      ...profile,
      avatarUrl: await createPrivateObjectUrl(profile.avatarUrl),
    },
  } as Portfolio;
};

export const uploadPortfolioAvatar = async (
  userId: number,
  portfolioId: number,
  file: AvatarFile,
) => {
  const portfolio = await ownedPortfolio(userId, portfolioId);
  validatePortfolioAvatar(file);

  const key = createPortfolioAvatarKey(portfolioId, file.mimetype);
  await putPrivateObject({ key, body: file.buffer, contentType: file.mimetype });

  const existingProfile = profileSchema.parse(portfolio.profile);
  const previousKey = existingProfile.avatarUrl;
  const updatedProfile = { ...existingProfile, avatarUrl: key };

  try {
    const updated = await prisma.portfolio.update({
      where: { id: portfolioId },
      data: { profile: jsonValue(updatedProfile) },
    });

    if (previousKey && avatarKeyPattern.test(previousKey)) {
      await deletePrivateObject(previousKey).catch((error) => {
        console.error("기존 프로필 이미지 삭제에 실패했습니다.", error);
      });
    }

    return withSignedAvatarUrl(updated);
  } catch (error) {
    await deletePrivateObject(key).catch(() => undefined);
    throw error;
  }
};

export const getPortfolioAvatarUrl = async (userId: number, portfolioId: number) => {
  const portfolio = await ownedPortfolio(userId, portfolioId);
  const profile = profileSchema.parse(portfolio.profile);
  if (!profile.avatarUrl || !avatarKeyPattern.test(profile.avatarUrl)) {
    throw new AppError(404, "프로필 사진을 찾을 수 없습니다.", "AVATAR_NOT_FOUND");
  }
  return createPrivateObjectUrl(profile.avatarUrl);
};
