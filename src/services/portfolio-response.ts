import type { Portfolio } from "@prisma/client";

/** 내부 AI 실행 정보는 생성·조회·수정·공유 응답에 노출하지 않는다. */
export const toPortfolioResponse = (portfolio: Portfolio) => {
  const { aiMeta, aiWarnings, ...response } = portfolio;
  return response;
};
