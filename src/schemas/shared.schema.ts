import { z } from "zod";

export const shareTokenParamSchema = z.object({
  shareToken: z.string().min(1, "shareToken이 필요합니다."),
});