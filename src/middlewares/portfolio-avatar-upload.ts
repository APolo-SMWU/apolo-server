import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { MAX_PORTFOLIO_AVATAR_BYTES } from "../services/portfolio-avatar";

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PORTFOLIO_AVATAR_BYTES, files: 1 },
});

export const portfolioAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
  parser.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(422, "프로필 사진은 5MB 이하만 업로드할 수 있습니다.", "AVATAR_TOO_LARGE"));
    }
    if (error) return next(error);
    return next();
  });
};
