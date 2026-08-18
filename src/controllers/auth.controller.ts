import { Request, Response } from "express";
import { login, signup } from "../services/auth.service";
import { validateRequest } from "../utils/validate-request";
import { loginSchema, signupSchema } from "../schemas/auth.schema";

export const signupUser = async (req: Request, res: Response) => {
  const { email, nickname, password, passwordCheck } = validateRequest(
    signupSchema,
    req.body
  );

  const user = await signup(email, nickname, password, passwordCheck);

  res.status(201).json({
    message: "회원가입이 완료되었습니다.",
    user,
  });
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = validateRequest(loginSchema, req.body);

  const { refreshToken, ...result } = await login(email, password);

  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    message: "로그인에 성공했습니다.",
    ...result,
  });
};
