import { z } from "zod";

const roleSchema = z.enum(["Professional", "Professor", "Student"]);
const optionalText = z.string().max(200).optional();

const profileFieldsSchema = z.object({
  role: roleSchema,
  phone: z
    .string()
    .regex(/^\d{3}-\d{4}-\d{4}$/, "휴대폰 번호 형식이 올바르지 않습니다."),
  github: z
    .union([z.string().url("올바른 GitHub URL 형식이 아닙니다."), z.literal("")])
    .optional(),
  company: optionalText,
  jobTitle: optionalText,
  tel: optionalText,
  university: optionalText,
  department: optionalText,
  major: optionalText,
});

const validateRoleFields = (
  data: z.infer<typeof profileFieldsSchema>,
  context: z.RefinementCtx
) => {
  const requiredFields =
    data.role === "Professional"
      ? ["company", "jobTitle", "tel"]
      : data.role === "Professor"
        ? ["university", "department", "tel"]
        : ["university", "major"];

  for (const field of requiredFields) {
    const value = data[field as keyof typeof data];
    if (typeof value !== "string" || value.trim() === "") {
      context.addIssue({
        code: "custom",
        path: [field],
        message: "필수 입력 항목입니다.",
      });
    }
  }
};

export const onboardingSchema = profileFieldsSchema.superRefine(validateRoleFields);

export const updateProfileSchema = profileFieldsSchema
  .extend({
    name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  })
  .superRefine(validateRoleFields);

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(8, "현재 비밀번호는 8자 이상이어야 합니다."),
  newPassword: z
    .string()
    .min(8, "새 비밀번호는 8자 이상이어야 합니다."),
  newPasswordCheck: z
    .string()
    .min(8, "새 비밀번호 확인은 8자 이상이어야 합니다."),
});
