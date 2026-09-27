import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { AppError } from "../errors/app-error";
import { generateViaHttp, updateContentViaHttp } from "./ai-http.service";
import type { GenerateRequest } from "./ai-generate.mapper";
import type { UpdateContentRequest } from "./ai.service";

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.AI_BASE_URL;
const originalTimeout = process.env.AI_TIMEOUT_MS;

const request: GenerateRequest = {
  userId: 900000003,
  userType: "student",
  myPageProfile: {
    name: "HTTP 테스트 사용자",
    email: "http-test@example.com",
    phone: "010-0000-0000",
    github: null,
    company: null,
    jobTitle: null,
    tel: null,
    university: "테스트대학교",
    department: null,
    major: "컴퓨터과학",
  },
  title: "HTTP 계약 테스트",
  externalLinks: ["https://example.com"],
  requirements: "프로젝트 중심",
  attachments: [],
};

const validResponse = {
  blocks: [],
  meta: { ontologySchemaVersion: "1.1", knowledgeGraphVersion: 0 },
  warnings: [],
};

const updateRequest: UpdateContentRequest = {
  userId: 900000003,
  sourceLinks: ["https://example.com/source"],
  requirements: "프로젝트 중심",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBaseUrl === undefined) delete process.env.AI_BASE_URL;
  else process.env.AI_BASE_URL = originalBaseUrl;
  if (originalTimeout === undefined) delete process.env.AI_TIMEOUT_MS;
  else process.env.AI_TIMEOUT_MS = originalTimeout;
});

describe("generateViaHttp", () => {
  it("정상 AI 응답을 반환한다", async () => {
    process.env.AI_BASE_URL = "http://ai.test";
    globalThis.fetch = async (input, init) => {
      assert.equal(input.toString(), "http://ai.test/generate");
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify(validResponse), { status: 200 });
    };

    const result = await generateViaHttp(request);

    assert.deepEqual(result, validResponse);
  });

  it("AI 응답 계약이 틀리면 INVALID_AI_RESPONSE를 반환한다", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ blocks: [], meta: {}, warnings: [] }), { status: 200 });

    await assert.rejects(generateViaHttp(request), (error: unknown) =>
      error instanceof AppError && error.errorCode === "INVALID_AI_RESPONSE"
    );
  });

  it("AI 서버가 오류 상태를 반환하면 AI_REQUEST_FAILED를 반환한다", async () => {
    globalThis.fetch = async () => new Response(null, { status: 500 });

    await assert.rejects(generateViaHttp(request), (error: unknown) =>
      error instanceof AppError && error.errorCode === "AI_REQUEST_FAILED"
    );
  });
});

describe("updateContentViaHttp", () => {
  it("/update-content에 Source 링크와 사용자 ID를 전달한다", async () => {
    process.env.AI_BASE_URL = "http://ai.test";
    globalThis.fetch = async (input, init) => {
      assert.equal(input.toString(), "http://ai.test/update-content");
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), updateRequest);
      return new Response(JSON.stringify(validResponse), { status: 200 });
    };

    const result = await updateContentViaHttp(updateRequest);

    assert.deepEqual(result, validResponse);
  });

  it("/update-content 응답도 기존 Graph B 계약으로 검증한다", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ blocks: [], meta: {}, warnings: [] }), { status: 200 });

    await assert.rejects(updateContentViaHttp(updateRequest), (error: unknown) =>
      error instanceof AppError && error.errorCode === "INVALID_AI_RESPONSE"
    );
  });
});
