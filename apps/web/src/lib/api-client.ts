import type { AppType } from "@fynn/api";
import { hc } from "hono/client";
import { env } from "@/env";

export const apiClient = hc<AppType>(env.NEXT_PUBLIC_API_URL);
