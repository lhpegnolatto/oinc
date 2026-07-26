import { expect, test } from "@playwright/test";
import {
  cookieHeaderToPlaywrightCookies,
  deleteSeededUser,
  seedSignedInUser,
} from "./seed-session";

async function createWallet(
  page: import("@playwright/test").Page,
  name: string,
  balance: string,
) {
  await page.goto("/wallets");
  await page.getByRole("button", { name: "Add wallet" }).click();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Starting balance", { exact: true }).fill(balance);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function createCard(
  page: import("@playwright/test").Page,
  name: string,
  balance: string,
) {
  await page.goto("/credit-cards");
  await page.getByRole("button", { name: "Add credit card" }).click();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Starting balance", { exact: true }).fill(balance);
  await page.getByLabel("Statement close day", { exact: true }).fill("1");
  await page.getByLabel("Due day", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

test.describe("credit card payments", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const seeded = await seedSignedInUser(
      "Ada Lovelace",
      `credit-card-payments-e2e-${crypto.randomUUID()}@example.com`,
    );
    userId = seeded.userId;
    await context.addCookies(cookieHeaderToPlaywrightCookies(seeded.cookie));
  });

  test.afterEach(async () => {
    await deleteSeededUser(userId);
  });

  test("paying a card from its detail page updates the balance and statement total, and the payment appears in the payment history", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "500");
    await createCard(page, "Rewards Card", "100");

    await page.getByText("Rewards Card", { exact: true }).click();
    await expect(page).toHaveURL(/\/credit-cards\/[^/]+$/);
    await expect(
      page.getByText("$100.00 owed", { exact: false }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Pay card" }).click();
    await expect(
      page.getByRole("dialog", { name: "Pay Rewards Card" }),
    ).toBeVisible();

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Checking" }).click();
    await page.getByLabel("Amount").fill("40");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Pay card" })
      .click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByText("$60.00 owed", { exact: false })).toBeVisible();
    await expect(page.getByText("Payment", { exact: true })).toBeVisible();
    await expect(page.getByText("-$40.00", { exact: true })).toBeVisible();

    await page.goto("/wallets");
    await expect(
      page.locator('[data-slot="card-content"]').getByText("$460.00"),
    ).toBeVisible();
  });
});
