import assert from "node:assert/strict";
import { test } from "node:test";

import type prisma from "../src/lib/prisma";
import { AppError } from "../src/errors/app-error";
import type { GenerateRequest } from "../src/services/ai-generate.mapper";
import type { UpdateContentRequest } from "../src/services/ai.service";
import { createPortfolioService } from "../src/services/portfolios.service";

const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const user = {
  id: 42, name: "File Test", email: "test@example.invalid", role: "student", phone: "010-1234-5678",
  github: null, company: null, jobTitle: null, tel: null, university: "Test University",
  department: null, major: "Computer Science", organizationAddress: null,
};
const input = { title: "Document portfolio", cardDesignId: "blue", siteDesignId: "blue", externalLinks: [] };
const file = { buffer: Buffer.from("document bytes"), size: 14, originalname: "resume.docx", mimetype: docx };
const output = { blocks: [], meta: { ontologySchemaVersion: "2.1", knowledgeGraphVersion: 1 }, warnings: [] };

function fixture(failAi = false) {
  const events: string[] = [];
  const uploaded: string[] = [];
  const deleted: string[] = [];
  const requests: GenerateRequest[] = [];
  const updates: UpdateContentRequest[] = [];
  let portfolio: Record<string, unknown> = { id: 7, userId: 42, sourceLinks: [], blocks: [], requirements: "" };
  let stored: { s3Key: string; originalName: string; mimeType: string; size: number; portfolioId: number }[] = [];
  const db = {
    user: { findUnique: async () => user },
    portfolio: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        events.push("created"); portfolio = { ...data, id: 7 }; return portfolio;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        portfolio = { ...portfolio, ...data }; return portfolio;
      },
      findUniqueOrThrow: async () => ({ ...portfolio, attachments: stored }),
      findFirst: async () => portfolio,
      delete: async () => { events.push("deleted"); },
    },
    portfolioAttachment: {
      createMany: async ({ data }: { data: typeof stored }) => { stored = data; },
      findMany: async () => stored,
    },
  };
  const service = createPortfolioService({
    prisma: db as unknown as typeof prisma,
    createId: () => "00000000-0000-4000-8000-000000000001",
    logoLookup: async () => null,
    storage: {
      putObject: async ({ key }) => { uploaded.push(key); events.push("uploaded"); },
      deleteObject: async (key) => { deleted.push(key); },
      signUrl: async (key) => `https://bucket.s3.ap-northeast-2.amazonaws.com/${key}?X-Amz-Signature=test`,
    },
    ai: {
      generate: async (request) => {
        events.push("generated"); requests.push(request);
        if (failAi) throw new AppError(502, "AI failed", "AI_REQUEST_FAILED");
        return output;
      },
      updateContent: async (request) => { updates.push(request); return output; },
      generateCv: async () => ({ sections: [], meta: {}, warnings: [] }),
    },
  });
  return { service, events, uploaded, deleted, requests, updates, stored: () => stored };
}

test("문서만으로 생성하며 저장된 원본의 서명 주소를 AI에 전달한다", async () => {
  const f = fixture();
  const result = await f.service.createOnlineCard(42, input, [file]);
  assert.equal(result.id, 7);
  assert.deepEqual(f.events, ["uploaded", "generated", "created"]);
  assert.equal(f.requests[0]?.attachments[0]?.mimeType, docx);
  assert.equal(f.requests[0]?.attachments[0]?.sourceUrl, f.uploaded[0]);
  assert.equal(f.stored()[0]?.s3Key, f.uploaded[0]);
  assert.deepEqual(f.requests[0]?.externalLinks, []);
});

test("AI 실패 시 선행 업로드를 정리하고 포트폴리오를 생성하지 않는다", async () => {
  const f = fixture(true);
  await assert.rejects(f.service.createOnlineCard(42, input, [file]),
    (error: unknown) => error instanceof AppError && error.errorCode === "AI_REQUEST_FAILED");
  assert.deepEqual(f.deleted, f.uploaded);
  assert.ok(!f.events.includes("created"));
});

test("콘텐츠 갱신에도 저장된 문서 첨부를 다시 전달한다", async () => {
  const f = fixture();
  await f.service.createOnlineCard(42, input, [file]);
  await f.service.refreshOnlineCardContent(42, 7);
  assert.equal(f.updates[0]?.attachments?.[0]?.sourceUrl, f.uploaded[0]);
  assert.equal(f.updates[0]?.attachments?.[0]?.fileName, "resume.docx");
});

test("링크나 문서가 없는 생성 요청은 업로드 전에 거부한다", async () => {
  const f = fixture();
  await assert.rejects(f.service.createOnlineCard(42, input),
    (error: unknown) => error instanceof AppError && error.errorCode === "SOURCE_REQUIRED");
  assert.deepEqual(f.events, []);
});
