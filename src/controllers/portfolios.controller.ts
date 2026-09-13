import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { validateRequest } from "../utils/validate-request";
import { portfolioIdParamSchema, shareIdParamSchema } from "../schemas/common.schema";
import { createPortfolioSchema, updateContentSchema, updatePortfolioSchema } from "../schemas/portfolio.schema";
import { createOnlineCard, getMyOnlineCards, getOwnedOnlineCard, updateOnlineCard, deleteOnlineCard, refreshOnlineCardContent } from "../services/portfolios.service";
import { createShareLink, getSharedOnlineCard } from "../services/portfolio-share.service";

const requireUser = (req: AuthRequest) => {
  if (!req.user?.userId) throw new Error("UNAUTHORIZED");
  return req.user.userId;
};

export const createPortfolioController = async (req: AuthRequest, res: Response) => {
  const portfolio = await createOnlineCard(requireUser(req), validateRequest(createPortfolioSchema, req.body));
  return res.status(201).json({ message: "온라인 명함 생성 성공", portfolio });
};
export const getMyPortfoliosController = async (req: AuthRequest, res: Response) =>
  res.status(200).json({ message: "내 온라인 명함 목록 조회 성공", portfolios: await getMyOnlineCards(requireUser(req)) });
export const getPortfolioByIdController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.status(200).json({ message: "온라인 명함 상세 조회 성공", portfolio: await getOwnedOnlineCard(requireUser(req), portfolioId) });
};
export const updatePortfolioController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.status(200).json({ message: "온라인 명함 수정 성공", portfolio: await updateOnlineCard(requireUser(req), portfolioId, validateRequest(updatePortfolioSchema, req.body)) });
};
export const deletePortfolioController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  await deleteOnlineCard(requireUser(req), portfolioId);
  return res.status(204).send();
};
export const updateContentController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  validateRequest(updateContentSchema, req.body);
  return res.status(200).json({ message: "외부 콘텐츠 갱신 성공", portfolio: await refreshOnlineCardContent(requireUser(req), portfolioId) });
};
export const createShareController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.status(201).json(await createShareLink(requireUser(req), portfolioId));
};
export const getSharedController = async (req: Request, res: Response) => {
  const { shareId } = validateRequest(shareIdParamSchema, req.params);
  return res.status(200).json({ message: "공유 온라인 명함 조회 성공", portfolio: await getSharedOnlineCard(shareId) });
};
