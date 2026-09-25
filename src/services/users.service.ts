import bcrypt from "bcryptjs";
import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";
import type { OnboardingInput, ProfileInput } from "../schemas/onboarding.schema";
import { lookupOrganizationAddress } from "./address-lookup.service";

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
  organizationAddress: true,
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

type OrganizationProfile = {
  role: string | null;
  company: string | null;
  university: string | null;
  organizationAddress: string | null;
};

// 재직자는 회사, 교수·학생은 학교가 소속 기관이다.
export const organizationNameOf = ({
  role,
  company,
  university,
}: Omit<OrganizationProfile, "organizationAddress">) => {
  const name = role?.toLowerCase() === "professional" ? company : university;
  return name?.trim() || null;
};

/**
 * 저장할 organizationAddress를 정한다. undefined면 기존 값을 그대로 둔다.
 * 1. 사용자가 기존과 다른 주소를 보냈으면 조회하지 않고 그 값을 쓴다. ("" → null)
 * 2. 소속 기관(회사·학교)이 바뀌었으면 새로 조회한다. 조회 실패 시 null.
 * 3. 둘 다 아니면 기존 주소를 유지한다.
 */
export const resolveOrganizationAddress = async (
  current: OrganizationProfile,
  input: OnboardingInput | ProfileInput,
  lookup = lookupOrganizationAddress,
): Promise<string | null | undefined> => {
  if (input.organizationAddress !== undefined) {
    const requested = input.organizationAddress || null;
    if (requested !== current.organizationAddress) return requested;
  }

  const nextOrganization = organizationNameOf({
    role: input.role,
    company: input.company ?? null,
    university: input.university ?? null,
  });
  if (nextOrganization === organizationNameOf(current)) return undefined;

  return nextOrganization ? lookup(nextOrganization) : null;
};

const organizationAddressData = (organizationAddress: string | null | undefined) =>
  organizationAddress === undefined ? {} : { organizationAddress };

export const completeOnboarding = async (
  userId: number,
  input: OnboardingInput
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingCompleted: true,
      role: true,
      company: true,
      university: true,
      organizationAddress: true,
    },
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

  const organizationAddress = await resolveOrganizationAddress(user, input);

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...profileData(input),
      ...organizationAddressData(organizationAddress),
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

  const organizationAddress = await resolveOrganizationAddress(user, input);

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name: input.name,
      ...profileData(input),
      ...organizationAddressData(organizationAddress),
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
