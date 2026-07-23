import { Hono } from "hono";
import { errorHandler } from "../shared/middleware/error-handler";
import { requestLogging } from "../shared/middleware/logging";
import {
  type RequestIdVariables,
  requestId,
} from "../shared/middleware/request-id";
import { registerRoutes } from "./routes";

export type Env = {
  Variables: RequestIdVariables;
};

export const app = new Hono<Env>();

app.use("*", requestId());
app.use("*", requestLogging());

app.onError(errorHandler);

registerRoutes(app);

export type AppType = typeof app;
