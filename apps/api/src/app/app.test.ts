import { describe, expect, test } from "bun:test";
import { env } from "../env";
import { app } from "./app";

describe("app", () => {
  test("responds to a request without crashing", async () => {
    const res = await app.request("/");
    expect(res).toBeInstanceOf(Response);
  });

  test("credentialed request from apps/web's trusted origin gets an explicit CORS origin", async () => {
    const res = await app.request("/", {
      headers: { Origin: env.WEB_APP_URL },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      env.WEB_APP_URL,
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  test("request from an origin outside trustedOrigins is rejected by CORS", async () => {
    const res = await app.request("/", {
      headers: { Origin: "https://not-trusted.example.com" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
