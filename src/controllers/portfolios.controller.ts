import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createPortfolio, getMyPortfolios, getPortfolioById, updatePortfolio, updatePortfolioVisibility} from "../services/portfolios.service";

export const createPortfolioController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const {
    title,
    jobRole,
    careerLevel,
    directionPrompt,
    externalLinks,
    currentContentJson,
  } = req.body;

  const portfolio = await createPortfolio(
    userId,
    title,
    jobRole,
    careerLevel,
    directionPrompt,
    externalLinks,
    currentContentJson
  );

  res.status(201).json({
    message: "포트폴리오 생성 성공",
    portfolio,
  });
};

export const getMyPortfoliosController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const portfolios = await getMyPortfolios(userId);

  res.status(200).json({
    message: "내 포트폴리오 목록 조회 성공",
    portfolios,
  });
};

export const getPortfolioByIdController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const portfolioId = Number(req.params.portfolioId);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const portfolio = await getPortfolioById(userId, portfolioId);

  res.status(200).json({
    message: "포트폴리오 상세 조회 성공",
    portfolio,
  });
};

export const updatePortfolioController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const portfolioId = Number(req.params.portfolioId);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const {
    title,
    jobRole,
    careerLevel,
    directionPrompt,
    externalLinks,
    currentContentJson,
  } = req.body;

  const portfolio = await updatePortfolio(
    userId,
    portfolioId,
    title,
    jobRole,
    careerLevel,
    directionPrompt,
    externalLinks,
    currentContentJson
  );

  res.status(200).json({
    message: "포트폴리오 수정 성공",
    portfolio,
  });
};

export const updatePortfolioVisibilityController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const portfolioId = Number(req.params.portfolioId);
  const { isPublic } = req.body;

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const portfolio = await updatePortfolioVisibility(
    userId,
    portfolioId,
    isPublic
  );

  res.status(200).json({
    message: "포트폴리오 공개 여부 수정 성공",
    portfolio,
  });
};