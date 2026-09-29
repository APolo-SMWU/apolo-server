import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { MAX_WORK_UPLOAD_BYTES } from "../services/portfolio-work-image.service";

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_WORK_UPLOAD_BYTES, files: 1 },
});

export const portfolioWorkImageUpload = (req: Request, res: Response, next: NextFunction) => {
  parser.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(422, "프로젝트 이미지는 10MB 이하만 업로드할 수 있습니다.", "WORK_IMAGE_TOO_LARGE"));
    }
    if (error) return next(error);
    return next();
  });
};
