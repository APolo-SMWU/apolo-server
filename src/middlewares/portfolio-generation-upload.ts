import multer from "multer";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error";
import {
  MAX_PORTFOLIO_ATTACHMENTS,
  MAX_PORTFOLIO_ATTACHMENT_BYTES,
} from "../services/portfolio-attachment";

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_PORTFOLIO_ATTACHMENTS,
    fileSize: MAX_PORTFOLIO_ATTACHMENT_BYTES,
  },
});

export const portfolioGenerationUpload = (req: Request, res: Response, next: NextFunction) => {
  parser.array("attachments", MAX_PORTFOLIO_ATTACHMENTS)(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(422, "첨부파일은 파일당 10MB 이하만 업로드할 수 있습니다.", "ATTACHMENT_TOO_LARGE"));
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT") {
      return next(new AppError(422, "첨부파일은 한 번에 5개 이하만 업로드할 수 있습니다.", "TOO_MANY_ATTACHMENTS"));
    }
    if (error) return next(error);
    return next();
  });
};
