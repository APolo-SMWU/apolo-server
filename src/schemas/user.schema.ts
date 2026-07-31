import { z } from "zod";

export const updateProfileSchema = z.object({
  nickname: z
    .string()
    .min(2, "닉네임은 2자 이상이어야 합니다."),
});

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