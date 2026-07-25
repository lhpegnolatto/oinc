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

test.describe("transactions", () => {
  // These flows share one dev Next.js server + one apps/api server (see
  // playwright.config.ts's webServer) and each does several sequential
  // network round trips (create wallet -> navigate -> mutate -> invalidate
  // -> refetch) — running them in parallel with each other on a
  // resource-constrained machine can push that chain past assertion
  // timeouts even though nothing is actually broken. Serial keeps this
  // file's own tests from competing with each other; wallets.spec.ts still
  // runs in parallel alongside it.
  test.describe.configure({ mode: "serial" });

  let userId: string;

  test.beforeEach(async ({ context }) => {
    const seeded = await seedSignedInUser(
      "Ada Lovelace",
      `transactions-e2e-${crypto.randomUUID()}@example.com`,
    );
    userId = seeded.userId;
    await context.addCookies(cookieHeaderToPlaywrightCookies(seeded.cookie));
  });

  test.afterEach(async () => {
    await deleteSeededUser(userId);
  });

  test("pressing the shortcut key opens the quick-add sheet from anywhere in the private app", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("n");

    await expect(
      page.getByRole("dialog", { name: "Add transaction" }),
    ).toBeVisible();
  });

  test("the shortcut is ignored while typing in a text input", async ({
    page,
  }) => {
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("n");

    await expect(
      page.getByRole("dialog", { name: "Add transaction" }),
    ).not.toBeVisible();
    // The keystroke landed in the focused input instead of being hijacked.
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("n");
  });

  test("opening the sheet from a wallet's page pre-fills that wallet, and it stays changeable", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await createWallet(page, "Savings", "50");
    await page.goto("/wallets");
    await page.getByText("Checking", { exact: true }).click();
    await expect(page).toHaveURL(/\/wallets\/[^/]+$/);

    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.getByRole("combobox").last()).toContainText("Checking");

    // Still changeable before submitting.
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: "Savings" }).click();
    await expect(page.getByRole("combobox").last()).toContainText("Savings");
  });

  test("opening the sheet elsewhere requires picking a wallet before submitting", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await page.goto("/dashboard");
    await page.keyboard.press("n");

    await page.getByLabel("Amount").fill("10");
    await page.getByRole("button", { name: "Add transaction" }).last().click();

    // No wallet picked — the form rejects submission and the sheet stays open.
    await expect(
      page.getByRole("dialog", { name: "Add transaction" }),
    ).toBeVisible();
  });

  test("logging an expense against a wallet updates its balance and appears in the list", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await page.goto("/wallets");
    await page.getByText("Checking", { exact: true }).click();

    await page.getByRole("button", { name: "Add transaction" }).click();
    await page.getByRole("button", { name: "Expense" }).click();
    await page.getByLabel("Amount").fill("30");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Food & Dining" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add transaction" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Food & Dining")).toBeVisible();
    await expect(page.getByText("$70.00", { exact: true })).toBeVisible();
  });

  test("creating a custom category inline from the picker doesn't leave the form", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await page.goto("/wallets");
    await page.getByText("Checking", { exact: true }).click();

    await page.getByRole("button", { name: "Add transaction" }).click();
    await page.getByRole("button", { name: "New category" }).click();
    await page.getByPlaceholder("e.g. Groceries").fill("Side hustle income");
    await page
      .getByRole("dialog", { name: "New category" })
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "New category" }),
    ).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByRole("combobox").first()).toContainText(
      "Side hustle income",
    );
  });

  test("editing a transaction's amount updates the wallet balance", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await page.goto("/wallets");
    await page.getByText("Checking", { exact: true }).click();

    await page.getByRole("button", { name: "Add transaction" }).click();
    await page.getByRole("button", { name: "Expense" }).click();
    await page.getByLabel("Amount").fill("20");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Food & Dining" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add transaction" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText("$80.00", { exact: true })).toBeVisible();

    await page.getByText("Food & Dining").click();
    await page.getByLabel("Amount").fill("50");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("$50.00", { exact: true })).toBeVisible();
  });

  test("deleting a transaction reverses its balance effect", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await page.goto("/wallets");
    await page.getByText("Checking", { exact: true }).click();

    await page.getByRole("button", { name: "Add transaction" }).click();
    await page.getByRole("button", { name: "Expense" }).click();
    await page.getByLabel("Amount").fill("30");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Food & Dining" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add transaction" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText("$70.00", { exact: true })).toBeVisible();

    await page.getByText("Food & Dining").click();
    await page.getByRole("button", { name: "Delete transaction" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(page.getByText("$100.00", { exact: true })).toBeVisible();
    await expect(page.getByText("No transactions yet")).toBeVisible();
  });

  test("a wallet with no transactions shows an empty state with a way to log the first one", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await page.goto("/wallets");
    await page.getByText("Checking", { exact: true }).click();

    await expect(page.getByText("No transactions yet")).toBeVisible();
    await page.getByRole("button", { name: "Log transaction" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add transaction" }),
    ).toBeVisible();
  });
});
