import { Request, Response } from "express";
import { login, logout, reissue, signup } from "../services/auth.service";
import { validateRequest } from "../utils/validate-request";
import { loginSchema, signupSchema } from "../schemas/auth.schema";

const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
});

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    ...getRefreshTokenCookieOptions(),
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
};

export const signupUser = async (req: Request, res: Response) => {
  const { email, name, password, passwordCheck } = validateRequest(
    signupSchema,
    req.body
  );

  const user = await signup(email, name, password, passwordCheck);

  res.status(201).json({
    message: "회원가입이 완료되었습니다.",
    user,
  });
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = validateRequest(loginSchema, req.body);

  const { refreshToken, ...result } = await login(email, password);

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    message: "로그인에 성공했습니다.",
    ...result,
  });
};

export const reissueToken = async (req: Request, res: Response) => {
  const { refreshToken, ...result } = await reissue(
    req.cookies?.refreshToken
  );

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    message: "액세스 토큰이 재발급되었습니다.",
    ...result,
  });
};

export const logoutUser = (req: Request, res: Response) => {
  logout(req.cookies?.refreshToken);

  clearRefreshTokenCookie(res);

  res.status(200).json({
    message: "로그아웃되었습니다.",
  });
};
