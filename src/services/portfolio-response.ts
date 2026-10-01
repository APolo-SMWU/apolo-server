import type { Portfolio } from "@prisma/client";
import { normalizeStoredBlocks } from "./portfolio-content.service";
import { withSignedWorkImageUrls } from "./portfolio-work-image";

/** 내부 AI 실행 정보는 생성·조회·수정·공유 응답에 노출하지 않는다. */
export const toPortfolioResponse = async (portfolio: Portfolio) => {
  const { aiMeta, aiWarnings, requirements, cvKey, cvGeneratedAt, cvKgVersion, ...response } = portfolio;
  return {
    ...response,
    blocks: await withSignedWorkImageUrls(normalizeStoredBlocks(response.blocks)),
  };
};
