import { AppError } from "../errors/app-error";
import { cvGenerateResponseSchema } from "../schemas/ai-cv.schema";
import { generateResponseSchema } from "../schemas/ai-generate.schema";
import type { GenerateRequest } from "./ai-generate.mapper";
import type { CvGenerateRequest, UpdateContentRequest } from "./ai.service";

type JsonSchema<T> = {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
};

const postAiJson = async <T>(
  path: string,
  request: unknown,
  schema: JsonSchema<T>,
  requestFailureMessage: string,
  timeout: { env: string; fallbackMs: string } = { env: "AI_TIMEOUT_MS", fallbackMs: "30000" },
): Promise<T> => {
  let url: URL;
  const timeoutMs = Number(process.env[timeout.env] ?? timeout.fallbackMs);
  try {
    const base = new URL(process.env.AI_BASE_URL || "http://127.0.0.1:8000");
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
      throw new Error("Invalid configuration");
    }
    url = new URL(path, base);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) {
      throw new Error("Invalid timeout");
    }
  } catch {
    throw new AppError(500, "AI 서버 연결 설정을 확인해주세요.", "AI_CONFIGURATION_ERROR");
  }

  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(request),
      signal,
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new AppError(502, requestFailureMessage, "AI_REQUEST_FAILED");
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (signal.aborted) throw error;
      throw new AppError(502, "AI 서버의 응답 형식이 올바르지 않습니다.", "INVALID_AI_RESPONSE");
    }
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new AppError(502, "AI 서버의 응답 형식이 올바르지 않습니다.", "INVALID_AI_RESPONSE");
    }
    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (signal.aborted) {
      throw new AppError(504, "AI 생성 응답 시간이 초과되었습니다.", "AI_TIMEOUT");
    }
    throw new AppError(502, "AI 서버에 연결할 수 없습니다.", "AI_UNAVAILABLE");
  }
};

/** Backend에서만 호출한다. URL은 사용자 입력이 아닌 서버 환경변수로 지정한다. */
export const generateViaHttp = (request: GenerateRequest) =>
  postAiJson(
    "/generate",
    request,
    generateResponseSchema,
    "AI 서버가 생성 요청을 처리하지 못했습니다.",
  );

export const updateContentViaHttp = (request: UpdateContentRequest) =>
  postAiJson(
    "/update-content",
    request,
    generateResponseSchema,
    "AI 서버가 콘텐츠 갱신 요청을 처리하지 못했습니다.",
  );

/** LLM 호출이 길어 다른 AI 호출과 별도 타임아웃(AI_CV_TIMEOUT_MS)을 쓴다. */
export const generateCvViaHttp = (request: CvGenerateRequest) =>
  postAiJson(
    "/generate-cv",
    request,
    cvGenerateResponseSchema,
    "AI 서버가 CV 생성 요청을 처리하지 못했습니다.",
    { env: "AI_CV_TIMEOUT_MS", fallbackMs: "120000" },
  );
