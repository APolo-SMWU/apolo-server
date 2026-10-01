import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { portfolioIdParamSchema } from "../schemas/common.schema";
import { generateCvSchema } from "../schemas/portfolio.schema";
import { ensureCv, getCvStatus } from "../services/cv/cv.service";
import { validateRequest } from "../utils/validate-request";

const requireUser = (req: AuthRequest) => {
  if (!req.user?.userId) throw new Error("UNAUTHORIZED");
  return req.user.userId;
};

export const getCvStatusController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.status(200).json({
    message: "CV 상태 조회 성공",
    cv: await getCvStatus(requireUser(req), portfolioId),
  });
};

export const generateCvController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  const { force } = validateRequest(generateCvSchema, req.body ?? {});
  const cv = await ensureCv(requireUser(req), portfolioId, { force });
  return res.status(200).json({
    message: cv.regenerated ? "CV 생성 성공" : "기존 CV 조회 성공",
    cv,
  });
};
