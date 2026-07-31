import { Request, Response } from "express";
import {
  getPublicPortfolios,
  getPublicPortfolioById,
} from "../services/archive.service";

export const getPublicPortfoliosController = async (
  req: Request,
  res: Response
) => {
  const portfolios = await getPublicPortfolios();

  res.status(200).json({
    message: "공개 포트폴리오 목록 조회 성공",
    portfolios,
  });
};

export const getPublicPortfolioByIdController = async (
  req: Request,
  res: Response
) => {
  const portfolioId = Number(req.params.portfolioId);

  const portfolio = await getPublicPortfolioById(portfolioId);

  res.status(200).json({
    message: "공개 포트폴리오 상세 조회 성공",
    portfolio,
  });
};