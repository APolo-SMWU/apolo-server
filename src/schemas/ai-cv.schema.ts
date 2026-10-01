import { z } from "zod";
import { aiMetaSchema, aiWarningsSchema } from "./ai-generate.schema";

const text = (max: number) => z.string().trim().min(1).max(max);

const cvEntrySchema = z
  .object({
    title: text(500),
    date: text(200).optional(),
    subtitle: text(500).optional(),
    location: text(200).optional(),
    link: z
      .object({
        label: text(50),
        href: z.string().regex(/^https?:\/\//i, "링크는 http(s) URL이어야 합니다."),
      })
      .strict()
      .optional(),
    bullets: z.array(text(300)).default([]),
  })
  .strict();

const cvSectionSchema = z
  .object({
    title: text(50),
    layout: z.enum(["entries", "bullets"]),
    entries: z.array(cvEntrySchema),
  })
  .strict();

export const cvGenerateResponseSchema = z
  .object({
    sections: z.array(cvSectionSchema),
    meta: aiMetaSchema,
    warnings: aiWarningsSchema,
  })
  .strict();

export type AiCvResponse = z.infer<typeof cvGenerateResponseSchema>;
