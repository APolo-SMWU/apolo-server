import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Portfolio } from "@prisma/client";

import { toPortfolioResponse } from "./portfolio-response";

describe("toPortfolioResponse", () => {
  it("내부 requirements와 AI 실행 정보를 외부 응답에서 제외한다", () => {
    const response = toPortfolioResponse({
      id: 1,
      title: "테스트 포트폴리오",
      requirements: "프로젝트 중심",
      aiMeta: { knowledgeGraphVersion: 1 },
      aiWarnings: [],
    } as unknown as Portfolio);

    assert.equal("requirements" in response, false);
    assert.equal("aiMeta" in response, false);
    assert.equal("aiWarnings" in response, false);
    assert.equal(response.title, "테스트 포트폴리오");
  });
});
