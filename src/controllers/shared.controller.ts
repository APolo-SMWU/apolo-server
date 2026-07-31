import { Request, Response } from "express";
import { getSharedPortfolioByToken } from "../services/shared.service";
import { validateRequest } from "../utils/validate-request";
import { shareTokenParamSchema } from "../schemas/shared.schema";

export const getSharedPortfolioController = async (
  req: Request,
  res: Response
) => {
  const { shareToken } = validateRequest(shareTokenParamSchema, req.params);

  const portfolio = await getSharedPortfolioByToken(shareToken);

  res.status(200).json({
    message: "공유 포트폴리오 조회 성공",
    portfolio,
  });
};