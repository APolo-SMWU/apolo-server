import OpenAI from "openai";
import { z } from "zod";

const DEFAULT_MODEL = "gpt-4.1-mini";
const LOOKUP_TIMEOUT_MS = 10_000;

const INSTRUCTIONS = `당신은 한국의 회사·학교 주소를 알려주는 도우미입니다.
입력으로 회사명 또는 학교명이 주어집니다.
- 그 기관의 대표 주소(본사·본교)를 한국 도로명주소 형식으로 알려주세요. 예: "서울특별시 용산구 청파로47길 100"
- 확실히 알고 있을 때만 답하고, 모르거나 같은 이름의 기관이 여러 곳이라 특정할 수 없으면 address를 null로 두세요.
- 추측으로 주소를 지어내지 마세요.`;

const lookupResultSchema = z.object({
  address: z.string().nullable(),
});

let client: OpenAI | null = null;

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ timeout: LOOKUP_TIMEOUT_MS, maxRetries: 0 });
  return client;
};

/**
 * 회사명·학교명으로 대표 주소를 조회한다.
 * 모르거나 조회에 실패하면 null을 돌려주고, 에러를 던지지 않는다.
 */
export const lookupOrganizationAddress = async (
  organizationName: string,
): Promise<string | null> => {
  const name = organizationName.trim();
  if (!name) return null;

  const openai = getClient();
  if (!openai) {
    console.warn("[address-lookup] OPENAI_API_KEY가 없어 주소 조회를 건너뜁니다.");
    return null;
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: INSTRUCTIONS,
      input: name,
      text: {
        format: {
          type: "json_schema",
          name: "organization_address",
          strict: true,
          schema: {
            type: "object",
            properties: { address: { type: ["string", "null"] } },
            required: ["address"],
            additionalProperties: false,
          },
        },
      },
    });

    const { address } = lookupResultSchema.parse(JSON.parse(response.output_text));
    return address?.trim() || null;
  } catch (error) {
    console.warn(
      `[address-lookup] "${name}" 주소 조회 실패:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};
