import bcrypt from "bcryptjs";
import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";

// 내 프로필 수정
export const updateMyProfile = async (
  userId: number,
  name: string
) => {
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
      name,
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
  };
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
