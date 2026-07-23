export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: string[] = [],
  ) {
    super(message);
  }
}

export class NotFoundError extends ApiError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details: string[] = []) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Sign-in required") {
    super(401, "UNAUTHORIZED", message);
  }
}
