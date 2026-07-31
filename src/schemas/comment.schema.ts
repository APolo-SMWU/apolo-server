import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "댓글 내용은 비어 있을 수 없습니다.")
    .max(300, "댓글은 300자 이하로 작성해주세요."),
});