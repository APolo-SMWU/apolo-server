import { randomUUID } from "node:crypto";

import { AppError } from "../errors/app-error";

export const MAX_PORTFOLIO_ATTACHMENTS = 5;
export const MAX_PORTFOLIO_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const extensionByMimeType: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const validatePortfolioAttachment = (
  file: { mimetype: string; size: number; originalname?: string },
  count = 1,
) => {
  if (!extensionByMimeType[file.mimetype]) {
    throw new AppError(422, "지원하지 않는 첨부파일 형식입니다. PDF, JPG, PNG만 업로드할 수 있습니다.", "INVALID_ATTACHMENT_TYPE");
  }
  if (file.size > MAX_PORTFOLIO_ATTACHMENT_BYTES) {
    throw new AppError(422, "첨부파일은 파일당 10MB 이하만 업로드할 수 있습니다.", "ATTACHMENT_TOO_LARGE");
  }
  if (file.originalname && !/\.(?:pdf|jpe?g|png)$/i.test(file.originalname)) {
    throw new AppError(422, "첨부파일 확장자는 PDF, JPG, PNG만 사용할 수 있습니다.", "INVALID_ATTACHMENT_EXTENSION");
  }
  if (count > MAX_PORTFOLIO_ATTACHMENTS) {
    throw new AppError(422, "첨부파일은 한 번에 5개 이하만 업로드할 수 있습니다.", "TOO_MANY_ATTACHMENTS");
  }
};

export const createPortfolioAttachmentKey = (portfolioId: number, mimetype: string) => {
  const extension = extensionByMimeType[mimetype];
  if (!extension) {
    throw new AppError(422, "지원하지 않는 첨부파일 형식입니다. PDF, JPG, PNG만 업로드할 수 있습니다.", "INVALID_ATTACHMENT_TYPE");
  }
  return `portfolios/${portfolioId}/attachments/${randomUUID()}.${extension}`;
};
