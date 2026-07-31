import { z } from "zod";

export const versionIdParamSchema = z.object({
  portfolioId: z.coerce.number().int().positive("portfolioId는 양수여야 합니다."),
  versionId: z.coerce.number().int().positive("versionId는 양수여야 합니다."),
});