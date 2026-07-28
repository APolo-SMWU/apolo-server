import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getMe, login, signup } from "../services/auth.service";

export const signupUser = async (req: Request, res: Response) => {
  const { email, nickname, password, passwordCheck } = req.body;

  const user = await signup(email, nickname, password, passwordCheck);

  res.status(201).json({
    message: "회원가입이 완료되었습니다.",
    user,
  });
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await login(email, password);

  res.status(200).json({
    message: "로그인에 성공했습니다.",
    ...result,
  });
};

export const getMyInfo = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      message: "인증된 사용자 정보가 없습니다.",
    });
  }

  const user = await getMe(userId);

  res.status(200).json({
    message: "내 정보 조회 성공",
    user,
  });
};