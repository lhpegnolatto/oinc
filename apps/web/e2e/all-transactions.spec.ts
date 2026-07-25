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

// TransactionListItem renders each row as a single <button>, whose
// accessible name includes the category name — role-scoped like this avoids
// strict-mode ambiguity against the filter selects' closed-but-still-mounted
// option text and value labels, which also contain these same category names.
function transactionRow(
  page: import("@playwright/test").Page,
  categoryName: string,
) {
  return page.getByRole("button", { name: categoryName });
}

async function logTransaction(
  page: import("@playwright/test").Page,
  input: {
    type: "Expense" | "Income";
    amount: string;
    category: string;
    wallet: string;
    date: string;
    note?: string;
  },
) {
  await page.goto("/dashboard");
  await page.keyboard.press("n");
  await page.getByRole("button", { name: input.type }).click();
  await page.getByLabel("Amount").fill(input.amount);
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: input.category }).click();
  await page.getByRole("combobox").last().click();
  await page.getByRole("option", { name: input.wallet }).click();
  await page.getByLabel("Date", { exact: true }).fill(input.date);
  if (input.note) {
    await page.getByLabel("Note").fill(input.note);
  }
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add transaction" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
}

test.describe("all-wallets transaction review (/transactions)", () => {
  // Shares one dev Next.js server + one apps/api server with the other
  // transaction e2e specs (see transactions.spec.ts's comment) — serial
  // keeps this file's own tests from racing each other.
  test.describe.configure({ mode: "serial" });

  let userId: string;

  test.beforeEach(async ({ context }) => {
    const seeded = await seedSignedInUser(
      "Ada Lovelace",
      `all-transactions-e2e-${crypto.randomUUID()}@example.com`,
    );
    userId = seeded.userId;
    await context.addCookies(cookieHeaderToPlaywrightCookies(seeded.cookie));
  });

  test.afterEach(async () => {
    await deleteSeededUser(userId);
  });

  test("filtering by wallet, category, type, date range, and note search (individually and combined) narrows the list, with the URL reflecting active filters", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await createWallet(page, "Savings", "100");

    await logTransaction(page, {
      type: "Expense",
      amount: "10",
      category: "Food & Dining",
      wallet: "Checking",
      date: "2026-01-05",
      note: "Weekly groceries",
    });
    await logTransaction(page, {
      type: "Income",
      amount: "500",
      category: "Salary",
      wallet: "Savings",
      date: "2026-01-20",
      note: "Paycheck",
    });

    await page.goto("/transactions");
    await expect(transactionRow(page, "Food & Dining")).toBeVisible();
    await expect(transactionRow(page, "Salary")).toBeVisible();

    // Filter by wallet.
    await page.getByRole("combobox", { name: "Filter by wallet" }).click();
    await page.getByRole("option", { name: "Checking" }).click();
    await expect(page).toHaveURL(/wallet=/);
    await expect(transactionRow(page, "Food & Dining")).toBeVisible();
    await expect(transactionRow(page, "Salary")).not.toBeVisible();

    await page.getByRole("combobox", { name: "Filter by wallet" }).click();
    await page.getByRole("option", { name: "All wallets" }).click();
    await expect(transactionRow(page, "Salary")).toBeVisible();

    // Filter by category.
    await page.getByRole("combobox", { name: "Filter by category" }).click();
    await page.getByRole("option", { name: "Salary" }).click();
    await expect(page).toHaveURL(/category=/);
    await expect(transactionRow(page, "Salary")).toBeVisible();
    await expect(transactionRow(page, "Food & Dining")).not.toBeVisible();

    await page.getByRole("combobox", { name: "Filter by category" }).click();
    await page.getByRole("option", { name: "All categories" }).click();

    // Filter by type.
    await page.getByRole("combobox", { name: "Filter by type" }).click();
    await page.getByRole("option", { name: "Income", exact: true }).click();
    await expect(page).toHaveURL(/type=income/);
    await expect(transactionRow(page, "Salary")).toBeVisible();
    await expect(transactionRow(page, "Food & Dining")).not.toBeVisible();

    await page.getByRole("combobox", { name: "Filter by type" }).click();
    await page.getByRole("option", { name: "All types" }).click();

    // Filter by date range.
    await page.getByLabel("From date").fill("2026-01-01");
    await page.getByLabel("To date").fill("2026-01-10");
    await expect(page).toHaveURL(/dateFrom=2026-01-01/);
    await expect(transactionRow(page, "Food & Dining")).toBeVisible();
    await expect(transactionRow(page, "Salary")).not.toBeVisible();

    await page.getByLabel("From date").fill("");
    await page.getByLabel("To date").fill("");

    // Filter by note search.
    await page.getByLabel("Search notes").fill("paycheck");
    await expect(page).toHaveURL(/q=paycheck/);
    await expect(transactionRow(page, "Salary")).toBeVisible();
    await expect(transactionRow(page, "Food & Dining")).not.toBeVisible();

    await page.getByLabel("Search notes").fill("");

    // Combined filters.
    await page.getByRole("combobox", { name: "Filter by wallet" }).click();
    await page.getByRole("option", { name: "Checking" }).click();
    await page.getByRole("combobox", { name: "Filter by type" }).click();
    await page.getByRole("option", { name: "Expense", exact: true }).click();
    await page.getByLabel("Search notes").fill("groceries");
    await expect(transactionRow(page, "Food & Dining")).toBeVisible();
    await expect(transactionRow(page, "Salary")).not.toBeVisible();
  });

  test("each row shows which wallet it belongs to", async ({ page }) => {
    await createWallet(page, "Checking", "100");
    await logTransaction(page, {
      type: "Expense",
      amount: "10",
      category: "Food & Dining",
      wallet: "Checking",
      date: "2026-01-05",
    });

    await page.goto("/transactions");
    await expect(transactionRow(page, "Food & Dining")).toBeVisible();
    await expect(page.getByTitle("Checking")).toBeVisible();
  });

  test("reloading a filtered /transactions URL restores the same filtered view", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await createWallet(page, "Savings", "100");
    await logTransaction(page, {
      type: "Expense",
      amount: "10",
      category: "Food & Dining",
      wallet: "Checking",
      date: "2026-01-05",
    });
    await logTransaction(page, {
      type: "Income",
      amount: "500",
      category: "Salary",
      wallet: "Savings",
      date: "2026-01-20",
    });

    await page.goto("/transactions");
    await page.getByRole("combobox", { name: "Filter by type" }).click();
    await page.getByRole("option", { name: "Income", exact: true }).click();
    await expect(page).toHaveURL(/type=income/);
    await expect(transactionRow(page, "Salary")).toBeVisible();
    await expect(transactionRow(page, "Food & Dining")).not.toBeVisible();

    await page.reload();

    await expect(transactionRow(page, "Salary")).toBeVisible();
    await expect(transactionRow(page, "Food & Dining")).not.toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Filter by type" }),
    ).toContainText("Income");
  });

  test("a wallet-appearance badge review scenario: an unfiltered view shows transactions across every wallet, with an empty state when there are none", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await expect(page.getByText("No transactions yet")).toBeVisible();

    await createWallet(page, "Checking", "100");
    await logTransaction(page, {
      type: "Expense",
      amount: "10",
      category: "Food & Dining",
      wallet: "Checking",
      date: "2026-01-05",
    });

    await page.goto("/transactions");
    await expect(transactionRow(page, "Food & Dining")).toBeVisible();

    await page.getByLabel("Search notes").fill("nothing-matches-this");
    await expect(page.getByText("No matching transactions")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(transactionRow(page, "Food & Dining")).toBeVisible();
  });
});
