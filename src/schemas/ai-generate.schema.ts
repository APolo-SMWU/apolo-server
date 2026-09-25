import { z } from "zod";
import { contentBlockSchema } from "./portfolio.schema";

// 기존 저장 항목·사용자 추가 항목과 달리 AI의 KG 기반 item에는 참조가 필수다.
const aiBlockSchema = contentBlockSchema.superRefine((block, context) => {
  if (block.id !== undefined) {
    context.addIssue({ code: "custom", path: ["id"], message: "AI는 표시용 ID를 발급하지 않습니다." });
  }
  if ("items" in block) {
    block.items.forEach((item, index) => {
      if (!item.entityId) {
        context.addIssue({ code: "custom", path: ["items", index, "entityId"], message: "entityId는 필수입니다." });
      }
      if (item.id !== undefined) {
        context.addIssue({ code: "custom", path: ["items", index, "id"], message: "AI는 표시용 ID를 발급하지 않습니다." });
      }
    });
  }
});

export const generateResponseSchema = z.object({
  blocks: z.array(aiBlockSchema),
  meta: z.object({
    ontologySchemaVersion: z.string().min(1),
    knowledgeGraphVersion: z.number().int().nonnegative(),
  }).strict(),
  warnings: z.array(z.object({
    source: z.string().optional(),
    code: z.string().min(1),
    message: z.string().min(1),
  }).strict()),
}).strict();

export type AiGenerateResponse = z.infer<typeof generateResponseSchema>;
