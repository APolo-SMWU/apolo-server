import bcrypt from "bcryptjs";
import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";
import type { OnboardingInput, ProfileInput } from "../schemas/onboarding.schema";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  github: true,
  company: true,
  jobTitle: true,
  tel: true,
  university: true,
  department: true,
  major: true,
  onboardingCompleted: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getMyProfile = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "사용자를 찾을 수 없습니다.", "NOT_FOUND");
  }

  return user;
};

const profileData = (input: OnboardingInput | ProfileInput) => ({
  role: input.role,
  phone: input.phone,
  github: input.github || null,
  company: input.company || null,
  jobTitle: input.jobTitle || null,
  tel: input.tel || null,
  university: input.university || null,
  department: input.department || null,
  major: input.major || null,
});

export const completeOnboarding = async (
  userId: number,
  input: OnboardingInput
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true },
  });

  if (!user) {
    throw new AppError(404, "사용자를 찾을 수 없습니다.", "NOT_FOUND");
  }

  if (user.onboardingCompleted) {
    throw new AppError(
      409,
      "온보딩이 이미 완료된 사용자입니다.",
      "ONBOARDING_ALREADY_COMPLETED"
    );
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...profileData(input),
      onboardingCompleted: true,
    },
    select: userSelect,
  });
};

// 내 프로필 수정
export const updateMyProfile = async (userId: number, input: ProfileInput) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError(404, "사용자를 찾을 수 없습니다.", "NOT_FOUND");
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name: input.name,
      ...profileData(input),
    },
    select: userSelect,
  });

  return updatedUser;
};

// 비밀번호 변경
export const updateMyPassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
  newPasswordCheck: string
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError(404, "사용자를 찾을 수 없습니다.", "NOT_FOUND");
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, "현재 비밀번호가 일치하지 않습니다.", "UNAUTHORIZED");
  }

  if (newPassword !== newPasswordCheck) {
    throw new AppError(400, "새 비밀번호가 일치하지 않습니다.", "BAD_REQUEST");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: "비밀번호 변경이 완료되었습니다.",
  };
};
