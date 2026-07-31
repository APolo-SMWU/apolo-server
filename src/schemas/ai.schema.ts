import { z } from "zod";

export const aiEditSchema = z.object({
  prompt: z
    .string()
    .min(1, "수정 요청 내용은 비어 있을 수 없습니다.")
    .max(500, "수정 요청은 500자 이하로 작성해주세요."),
});