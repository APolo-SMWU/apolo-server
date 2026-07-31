import { z } from "zod";

const externalLinkSchema = z.object({
  label: z
    .string()
    .min(1, "링크 이름은 비어 있을 수 없습니다.")
    .max(30, "링크 이름은 30자 이하로 작성해주세요."),
  url: z
    .string()
    .url("올바른 URL 형식이 아닙니다."),
});

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const createPortfolioSchema = z.object({
  title: z
    .string()
    .min(1, "제목은 비어 있을 수 없습니다.")
    .max(100, "제목은 100자 이하로 작성해주세요."),
  jobRole: z
    .string()
    .min(1, "직무는 비어 있을 수 없습니다.")
    .max(50, "직무는 50자 이하로 작성해주세요."),
  careerLevel: z
    .string()
    .min(1, "경력 수준은 비어 있을 수 없습니다.")
    .max(30, "경력 수준은 30자 이하로 작성해주세요."),
  directionPrompt: z
    .string()
    .min(1, "방향 설명은 비어 있을 수 없습니다.")
    .max(500, "방향 설명은 500자 이하로 작성해주세요."),
  externalLinks: z
    .array(externalLinkSchema)
    .max(10, "외부 링크는 10개 이하로 작성해주세요."),
  currentContentJson: jsonObjectSchema,
});

export const updatePortfolioSchema = z.object({
  title: z
    .string()
    .min(1, "제목은 비어 있을 수 없습니다.")
    .max(100, "제목은 100자 이하로 작성해주세요.")
    .optional(),
  jobRole: z
    .string()
    .min(1, "직무는 비어 있을 수 없습니다.")
    .max(50, "직무는 50자 이하로 작성해주세요.")
    .optional(),
  careerLevel: z
    .string()
    .min(1, "경력 수준은 비어 있을 수 없습니다.")
    .max(30, "경력 수준은 30자 이하로 작성해주세요.")
    .optional(),
  directionPrompt: z
    .string()
    .min(1, "방향 설명은 비어 있을 수 없습니다.")
    .max(500, "방향 설명은 500자 이하로 작성해주세요.")
    .optional(),
  externalLinks: z
    .array(externalLinkSchema)
    .max(10, "외부 링크는 10개 이하로 작성해주세요.")
    .optional(),
  currentContentJson: jsonObjectSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "수정할 항목을 하나 이상 입력해주세요.",
    path: ["body"],
  }
);

export const updatePortfolioVisibilitySchema = z.object({
  isPublic: z.boolean(),
});

export const updatePortfolioShareSchema = z.object({
  isShared: z.boolean(),
});
