import { randomUUID } from "node:crypto";

import { AppError } from "../errors/app-error";

export const MAX_PORTFOLIO_AVATAR_BYTES = 5 * 1024 * 1024;

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const validatePortfolioAvatar = (file: { mimetype: string; size: number }) => {
  if (!extensionByMimeType[file.mimetype]) {
    throw new AppError(422, "지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 업로드할 수 있습니다.", "INVALID_AVATAR_TYPE");
  }
  if (file.size > MAX_PORTFOLIO_AVATAR_BYTES) {
    throw new AppError(422, "프로필 사진은 5MB 이하만 업로드할 수 있습니다.", "AVATAR_TOO_LARGE");
  }
};

export const createPortfolioAvatarKey = (portfolioId: number, mimetype: string) => {
  const extension = extensionByMimeType[mimetype];
  if (!extension) {
    throw new AppError(422, "지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 업로드할 수 있습니다.", "INVALID_AVATAR_TYPE");
  }
  return `portfolios/${portfolioId}/avatar/${randomUUID()}.${extension}`;
};

export const portfolioAvatarExtension = (mimetype: string) => extensionByMimeType[mimetype];
