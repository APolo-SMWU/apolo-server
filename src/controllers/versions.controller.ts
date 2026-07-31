import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  getPortfolioVersions,
  getPortfolioVersionById,
} from "../services/versions.service";
import { validateRequest } from "../utils/validate-request";
import { portfolioIdParamSchema } from "../schemas/common.schema";
import { versionIdParamSchema } from "../schemas/version.schema";

export const getPortfolioVersionsController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const versions = await getPortfolioVersions(userId, portfolioId);

  res.status(200).json({
    message: "포트폴리오 버전 목록 조회 성공",
    versions,
  });
};

export const getPortfolioVersionByIdController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;

  const { portfolioId, versionId } = validateRequest(
    versionIdParamSchema,
    req.params
  );

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const version = await getPortfolioVersionById(
    userId,
    portfolioId,
    versionId
  );

  res.status(200).json({
    message: "포트폴리오 버전 상세 조회 성공",
    version,
  });
};