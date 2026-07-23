import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "./client";

describe("db client", () => {
  test("opens a connection and runs a trivial query", async () => {
    const result = await db.execute(sql`select 1 as value`);
    expect(result[0]?.value).toBe(1);
  });
});
