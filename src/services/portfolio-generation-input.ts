import { AppError } from "../errors/app-error";
import { createPortfolioSchema, type CreatePortfolioInput } from "../schemas/portfolio.schema";

export const parsePortfolioGenerationInput = (
  body: Record<string, unknown>,
): CreatePortfolioInput => {
  let externalLinks = body.externalLinks;

  if (typeof externalLinks === "string") {
    try {
      externalLinks = JSON.parse(externalLinks);
    } catch {
      throw new AppError(400, "외부 링크 형식이 올바르지 않습니다.", "INVALID_EXTERNAL_LINKS", [
        { field: "externalLinks", message: "JSON 배열 형식이어야 합니다." },
      ]);
    }
  }

  return createPortfolioSchema.parse({ ...body, externalLinks });
};
