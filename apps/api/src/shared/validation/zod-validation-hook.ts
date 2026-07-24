import { ValidationError } from "../errors";

// Wired into every zValidator() call so a failed request body/param validation
// throws through the shared ApiError -> errorHandler pipeline instead of
// @hono/zod-validator's default raw Zod-shaped 400 response — keeping every
// endpoint's error body conforming to shared/errors' { error: {...} } contract.
export function zodValidationHook(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  if (!result.success && result.error) {
    throw new ValidationError(
      "Validation failed",
      result.error.issues.map((issue) => issue.message),
    );
  }
}
