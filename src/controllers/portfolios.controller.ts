import { toPortfolioResponse } from "../services/portfolio-response";
import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { AppError } from "../errors/app-error";
import { validateRequest } from "../utils/validate-request";
import { portfolioIdParamSchema, portfolioWorkImageParamSchema, shareIdParamSchema } from "../schemas/common.schema";
import { updateContentSchema, updatePortfolioSchema } from "../schemas/portfolio.schema";
import { createOnlineCard, getMyOnlineCards, getOwnedOnlineCard, updateOnlineCard, deleteOnlineCard, refreshOnlineCardContent, type PortfolioGenerationAttachment } from "../services/portfolios.service";
import { parsePortfolioGenerationInput } from "../services/portfolio-generation-input";
import { createShareLink, getSharedOnlineCard } from "../services/portfolio-share.service";
import { getPortfolioAvatarUrl, uploadPortfolioAvatar, withSignedAvatarUrl } from "../services/portfolio-avatar.service";
import { uploadWorkImage } from "../services/portfolio-work-image.service";
import { generatePortfolioFrontImage } from "../services/portfolio-card-image.service";

const requireUser = (req: AuthRequest) => {
  if (!req.user?.userId) throw new Error("UNAUTHORIZED");
  return req.user.userId;
};

export const createPortfolioController = async (req: AuthRequest, res: Response) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  const attachments: PortfolioGenerationAttachment[] = files.map((file) => ({
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  }));
  const portfolio = await createOnlineCard(requireUser(req), parsePortfolioGenerationInput(req.body), attachments);
  return res.status(201).json({
    message: "온라인 명함 생성 성공",
    portfolio: await toPortfolioResponse(await withSignedAvatarUrl(portfolio)),
  });
};
export const getMyPortfoliosController = async (req: AuthRequest, res: Response) =>
  res.status(200).json({ message: "내 온라인 명함 목록 조회 성공", portfolios: await getMyOnlineCards(requireUser(req)) });
export const getPortfolioByIdController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.status(200).json({
    message: "온라인 명함 상세 조회 성공",
    portfolio: await toPortfolioResponse(await withSignedAvatarUrl(await getOwnedOnlineCard(requireUser(req), portfolioId))),
  });
};
export const updatePortfolioController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.status(200).json({
    message: "온라인 명함 수정 성공",
    portfolio: await toPortfolioResponse(await withSignedAvatarUrl(
      await updateOnlineCard(requireUser(req), portfolioId, validateRequest(updatePortfolioSchema, req.body)),
    )),
  });
};
export const deletePortfolioController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  await deleteOnlineCard(requireUser(req), portfolioId);
  return res.status(204).send();
};
export const updateContentController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  validateRequest(updateContentSchema, req.body);
  return res.status(200).json({
    message: "외부 콘텐츠 갱신 성공",
    portfolio: await toPortfolioResponse(await withSignedAvatarUrl(
      await refreshOnlineCardContent(requireUser(req), portfolioId),
    )),
  });
};
export const createShareController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.status(201).json(await createShareLink(requireUser(req), portfolioId));
};
export const uploadPortfolioAvatarController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  if (!req.file) {
    throw new AppError(400, "file 필드에 프로필 사진을 첨부해주세요.", "AVATAR_REQUIRED");
  }
  const portfolio = await uploadPortfolioAvatar(requireUser(req), portfolioId, req.file);
  return res.status(200).json({ message: "프로필 사진 업로드 성공", portfolio });
};
export const getPortfolioAvatarController = async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  return res.redirect(302, await getPortfolioAvatarUrl(requireUser(req), portfolioId));
};
export const uploadPortfolioWorkImageController = async (req: AuthRequest, res: Response) => {
  const { portfolioId, itemId } = validateRequest(portfolioWorkImageParamSchema, req.params);
  if (!req.file) {
    throw new AppError(400, "file 필드에 프로젝트 이미지를 첨부해주세요.", "WORK_IMAGE_REQUIRED");
  }
  const portfolio = await uploadWorkImage(requireUser(req), portfolioId, itemId, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
  return res.status(200).json({
    message: "프로젝트 이미지 업로드 성공",
    portfolio: await toPortfolioResponse(await withSignedAvatarUrl(portfolio)),
  });
};

type PortfolioFrontImageControllerDependencies = {
  getOwnedOnlineCard: typeof getOwnedOnlineCard;
  generatePortfolioFrontImage: typeof generatePortfolioFrontImage;
};

const sanitizeDownloadName = (value: string) => value
  .trim()
  .replace(/[\\/:*?"<>|\r\n]+/g, "-")
  .replace(/\s+/g, " ") || "portfolio";

export const buildFrontImageContentDisposition = (name: string) => {
  const normalizedName = sanitizeDownloadName(name);
  const asciiName = normalizedName.replace(/[^\x20-\x7E]/g, "");
  const fallbackName = asciiName || "portfolio";
  const encodedName = encodeURIComponent(`${normalizedName}-front.png`);
  return `attachment; filename="${fallbackName}-front.png"; filename*=UTF-8''${encodedName}`;
};

export const createExportPortfolioFrontImageController = (
  dependencies: PortfolioFrontImageControllerDependencies = {
    getOwnedOnlineCard,
    generatePortfolioFrontImage,
  },
) => async (req: AuthRequest, res: Response) => {
  const { portfolioId } = validateRequest(portfolioIdParamSchema, req.params);
  const portfolio = await dependencies.getOwnedOnlineCard(requireUser(req), portfolioId);
  const image = await dependencies.generatePortfolioFrontImage(portfolio);
  const name = String((portfolio.card as { name?: unknown }).name ?? "portfolio");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", buildFrontImageContentDisposition(name));
  return res.status(200).send(image);
};

export const exportPortfolioFrontImageController = createExportPortfolioFrontImageController();
export const getSharedController = async (req: Request, res: Response) => {
  const { shareId } = validateRequest(shareIdParamSchema, req.params);
  return res.status(200).json({
    message: "공유 온라인 명함 조회 성공",
    portfolio: await toPortfolioResponse(await withSignedAvatarUrl(await getSharedOnlineCard(shareId))),
  });
};
