import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

const formatZodErrors = (err: ZodError) => {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errorCode: err.errorCode,
      errors: err.errors,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "입력값이 올바르지 않습니다.",
      errorCode: "INVALID_INPUT",
      errors: formatZodErrors(err),
    });
  }

  return res.status(500).json({
    message: "서버 내부 오류가 발생했습니다.",
    errorCode: "INTERNAL_SERVER_ERROR",
    errors: [],
  });
};
