import { z } from "zod";

const requiredString = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label}은(는) 비어 있을 수 없습니다.`)
    .max(max, `${label}은(는) ${max}자 이하로 작성해주세요.`);

const httpUrlSchema = z
  .string()
  .url("올바른 URL 형식이 아닙니다.")
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "HTTP 또는 HTTPS URL만 사용할 수 있습니다.");

const generatedIdSchema = z.string().uuid().optional();

const avatarReferenceSchema = z.union([
  httpUrlSchema,
  z.string().regex(/^portfolios\/\d+\/avatar\/[0-9a-f-]+\.(?:jpg|png|webp)$/, "올바른 프로필 이미지 참조가 아닙니다."),
]);

export const projectLinkSchema = z
  .object({
    label: requiredString("링크 이름", 50),
    href: httpUrlSchema,
  })
  .strict();

const commonBlockFields = {
  id: generatedIdSchema,
  visible: z.boolean(),
};

export const aboutBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("about"),
    body: requiredString("자기소개", 10_000),
  })
  .strict();

const timelineDateSchema = z
  .string()
  .regex(/^\d{4}(?:\.(?:0[1-9]|1[0-2]))?$/, "날짜는 YYYY 또는 YYYY.MM 형식이어야 합니다.");

export const timelineItemSchema = z
  .object({
    id: generatedIdSchema,
    startDate: timelineDateSchema,
    endDate: z.union([timelineDateSchema, z.literal("Present")]).optional(),
    organization: requiredString("소속", 200),
    role: requiredString("역할", 200).optional(),
    description: requiredString("설명", 10_000).optional(),
    kind: z
      .enum([
        "fulltime",
        "intern",
        "research",
        "exchange",
        "volunteer",
        "club",
        "program",
        "talk",
      ])
      .optional(),
  })
  .strict();

export const timelineBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.enum([
      "education",
      "experience",
      "activities",
      "awards",
      "certification",
    ]),
    items: z.array(timelineItemSchema),
  })
  .strict();

export const workItemSchema = z
  .object({
    id: generatedIdSchema,
    kind: z.enum(["project", "publication", "opensource"]),
    title: requiredString("작업 제목", 200),
    role: requiredString("역할", 200).optional(),
    skills: z.array(requiredString("기술", 100)).optional(),
    description: requiredString("작업 설명", 10_000),
    imageUrl: httpUrlSchema.nullable().optional(),
    links: z.array(projectLinkSchema),
  })
  .strict();

export const worksBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("works"),
    items: z.array(workItemSchema),
  })
  .strict();

export const skillCategorySchema = z
  .object({
    id: generatedIdSchema,
    category: requiredString("기술 카테고리", 100),
    items: z.array(requiredString("기술", 100)),
  })
  .strict();

export const skillsBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("skills"),
    categories: z.array(skillCategorySchema),
  })
  .strict();

export const contentBlockSchema = z.union([
  aboutBlockSchema,
  timelineBlockSchema,
  worksBlockSchema,
  skillsBlockSchema,
]);

export const businessCardSchema = z
  .object({
    name: requiredString("이름", 100),
    headline: requiredString("헤드라인", 200),
    phone: requiredString("전화번호", 50),
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    organizationAddress: z.string().trim().max(500).nullable(),
    // 명함 생성 시 Backend가 조회한다. 이전에 만든 명함에는 없을 수 있다.
    logoUrl: httpUrlSchema.nullable().optional(),
  })
  .strict();

const profileFieldSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("email"),
      label: requiredString("프로필 필드 이름", 50),
      value: z.string().email("올바른 이메일 형식이 아닙니다."),
    })
    .strict(),
  z
    .object({
      kind: z.literal("phone"),
      label: requiredString("프로필 필드 이름", 50),
      value: requiredString("전화번호", 50),
    })
    .strict(),
  ...(["tel", "company", "university", "department", "major"] as const).map((kind) =>
    z
      .object({
        kind: z.literal(kind),
        label: requiredString("프로필 필드 이름", 50),
        value: requiredString("프로필 필드 값", 200),
      })
      .strict(),
  ),
  z
    .object({
      kind: z.enum(["github", "scholar", "blog", "linkedin", "notion"]),
      label: requiredString("프로필 필드 이름", 50),
      value: httpUrlSchema,
    })
    .strict(),
]);

const profileFields = {
  name: requiredString("이름", 100),
  title: requiredString("프로필 제목", 200),
  avatarUrl: avatarReferenceSchema.nullable(),
  fields: z.array(profileFieldSchema),
};

const requireMinimumProfileFields = (
  fields: z.infer<typeof profileFieldSchema>[] | undefined,
  context: z.RefinementCtx,
) => {
  if (!fields) return;

  for (const requiredKind of ["email", "phone"] as const) {
    if (!fields.some((field) => field.kind === requiredKind)) {
      context.addIssue({
        code: "custom",
        message: `${requiredKind} 프로필 필드는 필수입니다.`,
        path: ["fields"],
      });
    }
  }
};

export const profileSchema = z
  .object(profileFields)
  .strict()
  .superRefine((profile, context) => {
    requireMinimumProfileFields(profile.fields, context);
  });

const businessCardUpdateSchema = businessCardSchema
  .partial()
  .refine((card) => Object.keys(card).length > 0, {
    message: "수정할 명함 항목을 하나 이상 입력해주세요.",
  });

const profileUpdateSchema = z
  .object(profileFields)
  .partial()
  .strict()
  .superRefine((profile, context) => {
    if (Object.keys(profile).length === 0) {
      context.addIssue({
        code: "custom",
        message: "수정할 프로필 항목을 하나 이상 입력해주세요.",
      });
    }
    requireMinimumProfileFields(profile.fields, context);
  });

export const createPortfolioSchema = z
  .object({
    title: requiredString("제목", 100),
    cardDesignId: requiredString("명함 디자인 ID", 100),
    siteDesignId: requiredString("사이트 디자인 ID", 100),
    externalLinks: z.array(httpUrlSchema).min(1, "외부 링크를 하나 이상 입력해주세요."),
    requirements: requiredString("요구사항", 2_000).optional(),
  })
  .strict();

export const updatePortfolioSchema = z
  .object({
    title: requiredString("제목", 100).optional(),
    card: businessCardUpdateSchema.optional(),
    profile: profileUpdateSchema.optional(),
    blocks: z.array(contentBlockSchema).optional(),
    cardDesignId: requiredString("명함 디자인 ID", 100).optional(),
    siteDesignId: requiredString("사이트 디자인 ID", 100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "수정할 항목을 하나 이상 입력해주세요.",
    path: ["body"],
  });

export const updateContentSchema = z.object({}).strict();

export const sourceSnapshotSchema = z
  .object({
    url: httpUrlSchema,
    contentHash: requiredString("콘텐츠 해시", 500),
    lastFetchedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
