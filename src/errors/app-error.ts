type AppErrorDetail = {
  field: string;
  message: string;
};

export class AppError extends Error {
  statusCode: number;
  errorCode: string;
  errors: AppErrorDetail[];

  constructor(
    statusCode: number,
    message: string,
    errorCode = "APP_ERROR",
    errors: AppErrorDetail[] = []
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
  }
}
