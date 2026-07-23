import { app } from "./app/app";

export default {
  fetch: app.fetch,
  port: 3001,
};
export type { AppType } from "./app/app";
