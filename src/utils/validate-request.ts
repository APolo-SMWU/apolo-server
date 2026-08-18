import { ZodSchema } from "zod";
import { AppError } from "../errors/app-error";

export const validateRequest = <T>(schema: ZodSchema<T>, data: unknown) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    throw new AppError(
      400,
      "입력값이 올바르지 않습니다.",
      "INVALID_INPUT",
      errors
    );
  }

  return result.data;
};
