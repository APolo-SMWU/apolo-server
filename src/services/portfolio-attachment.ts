import { randomUUID } from "node:crypto";

import { AppError } from "../errors/app-error";

export const MAX_PORTFOLIO_ATTACHMENTS = 5;
export const MAX_PORTFOLIO_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const extensionByMimeType: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type AiSourceAttachment = {
  fileName: string;
  mimeType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  sourceUrl: string;
  downloadUrl: string;
};

export const isDocumentAttachment = (mimeType: string): mimeType is AiSourceAttachment["mimeType"] =>
  mimeType === "application/pdf" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const toAiAttachments = async (
  files: { originalName: string; mimeType: string; s3Key: string }[],
  signUrl: (key: string) => Promise<string>,
): Promise<AiSourceAttachment[]> => {
  const attachments: AiSourceAttachment[] = [];
  for (const file of files) {
    if (!isDocumentAttachment(file.mimeType)) continue;
    attachments.push({
      fileName: file.originalName,
      mimeType: file.mimeType,
      sourceUrl: file.s3Key,
      downloadUrl: await signUrl(file.s3Key),
    });
  }
  return attachments;
};

export const validatePortfolioAttachment = (
  file: { mimetype: string; size: number; originalname?: string },
  count = 1,
) => {
  if (!extensionByMimeType[file.mimetype]) {
    throw new AppError(422, "PDF, DOCX, JPG, PNG만 업로드할 수 있습니다.", "INVALID_ATTACHMENT_TYPE");
  }
  if (file.size <= 0 || file.size > MAX_PORTFOLIO_ATTACHMENT_BYTES) {
    throw new AppError(422, "첨부파일은 파일당 10MB 이하만 업로드할 수 있습니다.", "ATTACHMENT_TOO_LARGE");
  }
  const extension = file.originalname?.split(".").pop()?.toLowerCase().replace("jpeg", "jpg");
  if (file.originalname && extension !== extensionByMimeType[file.mimetype]) {
    throw new AppError(422, "첨부파일 이름과 파일 형식이 일치하지 않습니다.", "INVALID_ATTACHMENT_EXTENSION");
  }
  if (count > MAX_PORTFOLIO_ATTACHMENTS) {
    throw new AppError(422, "첨부파일은 한 번에 5개 이하만 업로드할 수 있습니다.", "TOO_MANY_ATTACHMENTS");
  }
};

export const createPortfolioAttachmentKey = (portfolioRef: number | string, mimetype: string) => {
  const extension = extensionByMimeType[mimetype];
  if (!extension) {
    throw new AppError(422, "PDF, DOCX, JPG, PNG만 업로드할 수 있습니다.", "INVALID_ATTACHMENT_TYPE");
  }
  return `portfolios/${portfolioRef}/attachments/${randomUUID()}.${extension}`;
};
