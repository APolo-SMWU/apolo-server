import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/app-error";
import prisma from "../lib/prisma";

// 회원가입
export const signup = async (
  email: string,
  nickname: string,
  password: string,
  passwordCheck: string
) => {

  // 비밀번호 확인
  if (password !== passwordCheck) {
    throw new AppError(400, "비밀번호가 일치하지 않습니다.", "BAD_REQUEST");
  }

  // 이메일, 닉네임 중복 확인
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUserByEmail) {
    throw new AppError(409, "이미 사용 중인 이메일입니다.", "EMAIL_ALREADY_EXISTS");
  }

  const existingUserByNickname = await prisma.user.findUnique({
    where: { nickname },
  });

  if (existingUserByNickname) {
    throw new AppError(409, "이미 사용 중인 닉네임입니다.", "NICKNAME_ALREADY_EXISTS");
  }

  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, 10);

  // 유저 생성
  const newUser = await prisma.user.create({
    data: {
      email,
      nickname,
      password: hashedPassword,
    },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    nickname: newUser.nickname,
  }
}

// 로그인
export const login = async (email: string, password: string) => {
  // 1. 이메일로 유저 찾기
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(401, "이메일 또는 비밀번호가 일치하지 않습니다.", "INVALID_CREDENTIALS");
  }

  // 2. 비밀번호 비교
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, "이메일 또는 비밀번호가 일치하지 않습니다.", "INVALID_CREDENTIALS");
  }

  // 3. JWT 발급
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "1h",
    }
  );

  // 4. 반환
  return {
    accessToken: token,
  };
};
