import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/app-error";

interface JwtPayload {
  userId: number;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError(401, "인증 토큰이 없습니다.", "UNAUTHORIZED"));
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return next(new AppError(401, "올바른 토큰 형식이 아닙니다.", "UNAUTHORIZED"));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError(401, "유효하지 않은 토큰입니다.", "UNAUTHORIZED"));
  }
};
