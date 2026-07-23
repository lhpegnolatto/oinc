import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ApiError } from "../errors/api-error";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.status as ContentfulStatusCode,
    );
  }
  console.error(err);
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong",
        details: [],
      },
    },
    500,
  );
};
