type AppErrorDetail = {
  field: string;
  message: string;
};

export class AppError extends Error {
  statusCode: number;
  code: string;
  errors: AppErrorDetail[];

  constructor(
    statusCode: number,
    message: string,
    code = "APP_ERROR",
    errors: AppErrorDetail[] = []
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}
