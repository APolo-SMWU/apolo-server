import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof AppError) {
    try {
      const parsedErrors = JSON.parse(err.message);

      return res.status(err.statusCode).json({
        message: "잘못된 요청입니다.",
        errors: parsedErrors,
      });
    } catch {
      return res.status(err.statusCode).json({
        message: err.message,
      });
    }
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return res.status(400).json({
      message: "잘못된 요청입니다.",
      errors,
    });
  }

  return res.status(500).json({
    message: "서버 내부 오류가 발생했습니다.",
  });
};