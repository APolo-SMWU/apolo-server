import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createPortfolio,
         getMyPortfolios,
         getPortfolioById,
         updatePortfolio,
         updatePortfolioVisibility,
         updatePortfolioShare,
} from "../services/portfolios.service";
import { generatePortfolioWithMock, editPortfolioWithMock } from "../services/ai.service";
import {
  createComment,
  getCommentsByPortfolioId,
} from "../services/comments.service";
import { validateRequest } from "../utils/validate-request";
import { createCommentSchema } from "../schemas/comment.schema";
import { aiEditSchema } from "../schemas/ai.schema";
import { portfolioIdParamSchema } from "../schemas/common.schema";
import {
  createPortfolioSchema,
  updatePortfolioSchema,
  updatePortfolioShareSchema,
  updatePortfolioVisibilitySchema,
} from "../schemas/portfolio.schema";

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
  } = validateRequest(createPortfolioSchema, req.body);

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
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);

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
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);

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
  } = validateRequest(updatePortfolioSchema, req.body);

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
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  const { isPublic } = validateRequest(updatePortfolioVisibilitySchema, req.body);

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

export const generatePortfolioController = async (
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

  const portfolio = await generatePortfolioWithMock(userId, portfolioId);

  res.status(200).json({
    message: "AI 초안 생성 성공",
    portfolio,
  });
};

export const editPortfolioWithAiController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  const { prompt } = validateRequest(aiEditSchema, req.body);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const portfolio = await editPortfolioWithMock(userId, portfolioId, prompt);

  res.status(200).json({
    message: "AI 수정 반영 성공",
    portfolio,
  });
};

export const createCommentController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  const { content } = validateRequest(createCommentSchema, req.body);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const comment = await createComment(userId, portfolioId, content);

  res.status(201).json({
    message: "댓글 작성 성공",
    comment,
  });
};

export const getCommentsByPortfolioController = async (
  req: AuthRequest,
  res: Response
) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);

  const comments = await getCommentsByPortfolioId(portfolioId);

  res.status(200).json({
    message: "댓글 목록 조회 성공",
    comments,
  });
};

export const updatePortfolioShareController = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user?.userId;
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  const { isShared } = validateRequest(updatePortfolioShareSchema, req.body);

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const portfolio = await updatePortfolioShare(userId, portfolioId, isShared);

  res.status(200).json({
    message: "포트폴리오 공유 여부 수정 성공",
    portfolio,
  });
};
