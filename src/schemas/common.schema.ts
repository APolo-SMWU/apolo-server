import { z } from "zod";

export const portfolioIdParamSchema = z.object({
  portfolioId: z.coerce.number().int().positive("portfolioId는 양수여야 합니다."),
});

export const shareIdParamSchema = z.object({
  shareId: z.string().uuid(),
});

export const commentIdParamSchema = z.object({
  commentId: z.coerce.number().int().positive("commentId는 양수여야 합니다."),
});
