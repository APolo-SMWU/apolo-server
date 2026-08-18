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

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 3600;
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 14; // 14일

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

  // 3. accessToken 발급
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    }
  );

  // 4. refreshToken 발급
  const refreshToken = jwt.sign(
    {
      userId: user.id,
    },
    process.env.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    }
  );

  // 5. 반환
  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    refreshToken,
  };
};

// 액세스 토큰 재발급
export const reissue = (refreshToken: string | undefined) => {
  if (!refreshToken) {
    throw new AppError(401, "유효하지 않은 리프레시 토큰입니다.", "INVALID_REFRESH_TOKEN");
  }

  let payload: { userId: number };
  try {
    payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as { userId: number };
  } catch (error) {
    throw new AppError(401, "유효하지 않은 리프레시 토큰입니다.", "INVALID_REFRESH_TOKEN");
  }

  // 1. accessToken 재발급
  const accessToken = jwt.sign(
    {
      userId: payload.userId,
    },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    }
  );

  // 2. refreshToken 회전(재발급) - 사용할 때마다 만료를 14일로 연장
  const newRefreshToken = jwt.sign(
    {
      userId: payload.userId,
    },
    process.env.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    }
  );

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    refreshToken: newRefreshToken,
  };
};
