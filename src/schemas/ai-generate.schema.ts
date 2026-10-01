import { z } from "zod";

const shortText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label}은(는) 비어 있을 수 없습니다.`).max(max);

const optionalNullableText = (label: string, max = 200) =>
  shortText(label, max).nullable().optional();

const entityIdSchema = shortText("KG Entity ID");

const startDateSchema = z
  .string()
  .regex(/^\d{4}(?:\.(?:0[1-9]|1[0-2]))?$/, "날짜는 YYYY 또는 YYYY.MM 형식이어야 합니다.")
  .nullable();

const endDateSchema = z
  .union([
    z.string().regex(/^\d{4}(?:\.(?:0[1-9]|1[0-2]))?$/, "날짜는 YYYY 또는 YYYY.MM 형식이어야 합니다."),
    z.literal("Present"),
  ])
  .nullable();

const blockFields = {
  visible: z.boolean(),
};

const educationItemSchema = z
  .object({
    entityId: entityIdSchema,
    startDate: startDateSchema,
    endDate: endDateSchema,
    organization: shortText("학교명"),
    role: optionalNullableText("전공·학위"),
  })
  .strict();

const educationBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("education"),
    items: z.array(educationItemSchema),
  })
  .strict();

const experienceItemSchema = z
  .object({
    entityId: entityIdSchema,
    startDate: startDateSchema,
    endDate: endDateSchema,
    organization: optionalNullableText("기관명"),
    role: optionalNullableText("직무"),
    description: optionalNullableText("설명", 10_000),
    kind: z.enum(["fulltime", "contract", "intern", "research"]).nullable().optional(),
  })
  .strict();

const experienceBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("experience"),
    items: z.array(experienceItemSchema),
  })
  .strict();

const activitiesItemSchema = z
  .object({
    entityId: entityIdSchema,
    startDate: startDateSchema,
    endDate: endDateSchema,
    organization: shortText("활동명·기관명"),
    role: optionalNullableText("역할"),
    description: optionalNullableText("설명", 10_000),
    kind: z.enum(["club", "volunteer", "program", "talk"]).nullable().optional(),
  })
  .strict();

const activitiesBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("activities"),
    items: z.array(activitiesItemSchema),
  })
  .strict();

const awardItemSchema = z
  .object({
    entityId: entityIdSchema,
    title: shortText("수상명"),
    issuer: optionalNullableText("수여 기관"),
    date: startDateSchema,
  })
  .strict();

const awardsBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("awards"),
    items: z.array(awardItemSchema),
  })
  .strict();

const certificationItemSchema = z
  .object({
    entityId: entityIdSchema,
    title: shortText("자격증명"),
    grade: optionalNullableText("등급·점수"),
    issuer: optionalNullableText("발급 기관"),
    date: startDateSchema,
  })
  .strict();

const certificationBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("certification"),
    items: z.array(certificationItemSchema),
  })
  .strict();

const projectLinkSchema = z
  .object({
    label: shortText("링크 이름", 50),
    href: z
      .string()
      .url("올바른 URL 형식이 아닙니다.")
      .refine(
        (value) => ["http:", "https:"].includes(new URL(value).protocol),
        "HTTP 또는 HTTPS URL만 사용할 수 있습니다.",
      ),
  })
  .strict();

const worksItemSchema = z
  .object({
    entityId: entityIdSchema,
    kind: z.enum(["project", "publication", "opensource"]),
    title: shortText("작업 제목"),
    role: optionalNullableText("역할"),
    skills: z.array(shortText("기술", 100)).nullable().optional(),
    description: optionalNullableText("작업 설명", 10_000),
    imageUrl: z
      .string()
      .url("올바른 이미지 URL 형식이 아닙니다.")
      .refine(
        (value) => ["http:", "https:"].includes(new URL(value).protocol),
        "HTTP 또는 HTTPS URL만 사용할 수 있습니다.",
      )
      .nullable()
      .optional(),
    links: z.array(projectLinkSchema).default([]),
  })
  .strict();

const worksBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("works"),
    items: z.array(worksItemSchema),
  })
  .strict();

const skillItemSchema = z
  .object({
    entityId: entityIdSchema.optional(),
    entityIds: z.array(entityIdSchema).min(1).optional(),
    name: shortText("기술", 100),
  })
  .strict()
  .refine((item) => Boolean(item.entityIds?.length || item.entityId), {
    message: "기술 KG ID가 하나 이상 필요합니다.",
  })
  .transform(({ entityId, entityIds, ...item }) => ({
    ...item,
    entityIds: entityIds ?? [entityId!],
  }));

const skillsBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("skills"),
    categories: z.array(
      z
        .object({
          category: shortText("기술 카테고리", 100),
          items: z.array(skillItemSchema),
        })
        .strict(),
    ),
  })
  .strict();

const aboutBlockSchema = z
  .object({
    ...blockFields,
    type: z.literal("about"),
    description: z.string().trim().max(10_000),
  })
  .strict();

export const aiContentBlockSchema = z.discriminatedUnion("type", [
  aboutBlockSchema,
  educationBlockSchema,
  experienceBlockSchema,
  activitiesBlockSchema,
  awardsBlockSchema,
  certificationBlockSchema,
  worksBlockSchema,
  skillsBlockSchema,
]);

export const aiMetaSchema = z
  .object({
    ontologySchemaVersion: z.string().min(1),
    knowledgeGraphVersion: z.number().int().nonnegative(),
  })
  .strict();

export const aiWarningsSchema = z
  .array(
    z
      .object({
        source: z.string().optional(),
        code: z.string().min(1),
        message: z.string().min(1),
      })
      .strict(),
  )
  .default([]);

export const generateResponseSchema = z
  .object({
    blocks: z.array(aiContentBlockSchema),
    meta: aiMetaSchema,
    warnings: aiWarningsSchema,
  })
  .strict();

export type AiGenerateResponse = z.infer<typeof generateResponseSchema>;
