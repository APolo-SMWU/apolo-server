import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Portfolio } from "@prisma/client";

import { createPortfolioService } from "./portfolios.service";
import type { GeneratedOnlineCard, OnlineCardAiProvider } from "./ai.service";

const portfolio = {
  id: 17,
  userId: 42,
  title: "테스트 명함",
  userType: "student",
  cardDesignId: "card",
  siteDesignId: "site",
  requirements: "프로젝트 중심",
  card: {},
  profile: {},
  blocks: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      type: "works",
      visible: true,
      items: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          entityId: "work-existing",
          kind: "project",
          title: "기존 프로젝트",
          description: "사용자가 직접 수정한 프로젝트",
          links: [],
        },
      ],
    },
  ],
  aiMeta: null,
  aiWarnings: null,
  sourceLinks: ["https://github.com/example/apolo"],
  sourceSnapshots: [
    {
      url: "https://github.com/example/apolo",
      contentHash: "sha256:old",
      lastFetchedAt: "2026-09-27T00:00:00.000Z",
    },
  ],
  schemaVersion: 1,
  status: "draft",
  createdAt: new Date("2026-09-27T00:00:00.000Z"),
  updatedAt: new Date("2026-09-27T00:00:00.000Z"),
} as unknown as Portfolio;

const updatedResponse: GeneratedOnlineCard = {
  blocks: [
    {
      type: "works",
      visible: true,
      items: [
        {
          entityId: "work-new",
          kind: "project",
          title: "새 프로젝트",
          description: "변경된 Source에서 추가된 프로젝트",
          links: [],
        },
      ],
    },
  ],
  meta: { ontologySchemaVersion: "1.1", knowledgeGraphVersion: 2 },
  warnings: [{ code: "SOURCE_UPDATED", message: "새 Source를 반영했습니다." }],
};

describe("createOnlineCard", () => {
  it("생성 요청의 requirements를 Portfolio에 저장한다", async () => {
    const ai: OnlineCardAiProvider = {
      generate: async () => updatedResponse,
      updateContent: async () => updatedResponse,
    };
    const createdData: Record<string, unknown>[] = [];
    const prisma = {
      user: {
        findUnique: async () => ({
          id: 42,
          email: "test@example.com",
          name: "테스트 사용자",
          role: "Student",
          phone: "010-0000-0000",
          github: null,
          company: null,
          jobTitle: null,
          tel: null,
          university: "테스트대학교",
          department: null,
          major: "컴퓨터과학",
          organizationAddress: null,
        }),
      },
      portfolio: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdData.push(data);
          return { ...portfolio, id: 18 };
        },
        findUniqueOrThrow: async () => ({ ...portfolio, id: 18 }),
      },
    } as never;
    const service = createPortfolioService({
      prisma,
      ai,
      logoLookup: async () => null,
    });

    await service.createOnlineCard(42, {
      title: "요구사항 저장 테스트",
      cardDesignId: "card",
      siteDesignId: "site",
      externalLinks: ["https://github.com/example/apolo"],
      requirements: "프로젝트 중심으로 구성",
    });

    assert.equal(createdData[0]?.requirements, "프로젝트 중심으로 구성");
  });
});

describe("refreshOnlineCardContent", () => {
  it("AI에 Source 링크를 전달하고 기존 blocks와 갱신 결과를 병합한다", async () => {
    const calls: unknown[] = [];
    const ai: OnlineCardAiProvider = {
      generate: async () => updatedResponse,
      updateContent: async (request) => {
        calls.push(request);
        return updatedResponse;
      },
    };
    const updates: unknown[] = [];
    const prisma = {
      portfolio: {
        findFirst: async () => portfolio,
        update: async ({ data }: { data: unknown }) => {
          updates.push(data);
          return { ...portfolio, ...(data as object) };
        },
      },
    } as never;
    const service = createPortfolioService({ prisma, ai });

    const result = await service.refreshOnlineCardContent(42, 17);

    assert.deepEqual(calls, [
      {
        userId: 42,
        sourceLinks: ["https://github.com/example/apolo"],
        requirements: "프로젝트 중심",
      },
    ]);
    assert.equal(updates.length, 1);
    const data = updates[0] as {
      blocks: Array<{ type: string; items: unknown[] }>;
      aiMeta: unknown;
      aiWarnings: unknown;
      sourceSnapshots?: unknown;
    };
    assert.equal(data.blocks[0]?.type, "works");
    assert.equal(data.blocks[0]?.items.length, 2);
    assert.deepEqual(data.aiMeta, updatedResponse.meta);
    assert.deepEqual(data.aiWarnings, updatedResponse.warnings);
    assert.equal(data.sourceSnapshots, undefined);
  });
});
