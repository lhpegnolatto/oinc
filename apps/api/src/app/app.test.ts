import { describe, expect, test } from "bun:test";
import { app } from "./app";

describe("app", () => {
  test("responds to a request without crashing", async () => {
    const res = await app.request("/");
    expect(res).toBeInstanceOf(Response);
  });
});
