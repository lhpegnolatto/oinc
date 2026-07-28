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

async function createHolding(
  page: import("@playwright/test").Page,
  name: string,
  currentValue: string,
) {
  await page.goto("/investments");
  await page.getByRole("button", { name: "Add holding" }).click();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Current value", { exact: true }).fill(currentValue);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function logTransaction(
  page: import("@playwright/test").Page,
  input: {
    type: "Expense" | "Income";
    amount: string;
    category: string;
    wallet: string;
    date: string;
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
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add transaction" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return isoDate(date);
}

test.describe("dashboard (/dashboard)", () => {
  // Shares dev servers with the other transaction e2e specs — serial keeps
  // this file's own tests from racing each other (see transactions.spec.ts).
  test.describe.configure({ mode: "serial" });

  let userId: string;

  test.beforeEach(async ({ context }) => {
    const seeded = await seedSignedInUser(
      "Ada Lovelace",
      `dashboard-e2e-${crypto.randomUUID()}@example.com`,
    );
    userId = seeded.userId;
    await context.addCookies(cookieHeaderToPlaywrightCookies(seeded.cookie));
  });

  test.afterEach(async () => {
    await deleteSeededUser(userId);
  });

  test("a wallet with a non-positive balance is excluded from the chart but still counted in net worth", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await createWallet(page, "Overdrawn", "-20");
    await createWallet(page, "Empty", "0");

    await page.goto("/dashboard");

    await expect(page.getByTestId("net-worth-headline")).toHaveText("$80.00");
    await expect(page.getByText("Checking", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Overdrawn", { exact: true }),
    ).not.toBeVisible();
    await expect(page.getByText("Empty", { exact: true })).not.toBeVisible();
  });

  test("shows at most 5 recent transactions, most recent first, each showing its wallet", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "1000");
    // Oldest to newest — Food & Dining (5 days ago) is the oldest of the 6
    // and should be excluded once the dashboard caps the list at 5.
    const entries = [
      { category: "Food & Dining", daysAgo: 5 },
      { category: "Transport", daysAgo: 4 },
      { category: "Housing", daysAgo: 3 },
      { category: "Health", daysAgo: 2 },
      { category: "Shopping", daysAgo: 1 },
      { category: "Entertainment", daysAgo: 0 },
    ];
    for (const entry of entries) {
      await logTransaction(page, {
        type: "Expense",
        amount: "10",
        category: entry.category,
        wallet: "Checking",
        date: daysAgo(entry.daysAgo),
      });
    }

    await page.goto("/dashboard");
    const recentCard = page.locator('[data-slot="card"]', {
      has: page.getByText("Recent transactions", { exact: true }),
    });
    const rows = recentCard.getByRole("button");

    await expect(rows).toHaveCount(5);
    // Oldest of the 6 logged (Food & Dining, 5 days ago) is not shown.
    await expect(
      recentCard.getByRole("button", { name: "Food & Dining" }),
    ).toHaveCount(0);
    // Most recent first: Entertainment (today) ... Transport (4 days ago).
    await expect(rows.nth(0)).toContainText("Entertainment");
    await expect(rows.nth(4)).toContainText("Transport");
    await expect(recentCard.getByTitle("Checking")).toHaveCount(5);
  });

  test("ranks top expense categories for the current month, excluding income and prior months", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "1000");
    await logTransaction(page, {
      type: "Expense",
      amount: "50",
      category: "Food & Dining",
      wallet: "Checking",
      date: daysAgo(0),
    });
    await logTransaction(page, {
      type: "Expense",
      amount: "30",
      category: "Transport",
      wallet: "Checking",
      date: daysAgo(1),
    });
    // Income this month — must not contribute to the ranking.
    await logTransaction(page, {
      type: "Income",
      amount: "999",
      category: "Salary",
      wallet: "Checking",
      date: daysAgo(0),
    });
    // Last month's expense — must not contribute to the ranking.
    await logTransaction(page, {
      type: "Expense",
      amount: "500",
      category: "Housing",
      wallet: "Checking",
      date: daysAgo(40),
    });

    await page.goto("/dashboard");
    const topCategoriesCard = page.locator('[data-slot="card"]', {
      has: page.getByText("Top categories this month", { exact: true }),
    });

    await expect(
      topCategoriesCard.getByText("Housing", { exact: true }),
    ).not.toBeVisible();
    await expect(
      topCategoriesCard.getByText("Salary", { exact: true }),
    ).not.toBeVisible();

    const foodEntry = topCategoriesCard.getByText("Food & Dining", {
      exact: true,
    });
    const transportEntry = topCategoriesCard.getByText("Transport", {
      exact: true,
    });
    await expect(foodEntry).toBeVisible();
    await expect(transportEntry).toBeVisible();
    await expect(
      topCategoriesCard.getByText("$50.00", { exact: true }),
    ).toBeVisible();
    await expect(
      topCategoriesCard.getByText("$30.00", { exact: true }),
    ).toBeVisible();
    const foodBox = await foodEntry.boundingBox();
    const transportBox = await transportEntry.boundingBox();
    expect(foodBox?.y).toBeLessThan(transportBox?.y ?? Number.NaN);
  });

  test("a user with no wallets sees the create-wallet prompt and none of the other dashboard sections", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("No wallets yet")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create wallet" }),
    ).toBeVisible();
    await expect(page.getByText("Recent transactions")).not.toBeVisible();
    await expect(page.getByText("Top categories this month")).not.toBeVisible();
  });

  test("clicking the dashboard's Add transaction button opens the quick-add sheet without navigating away", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Add transaction" }).click();

    await expect(
      page.getByRole("dialog", { name: "Add transaction" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("net worth combines wallets, investments, and credit card balances", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await createWallet(page, "Savings", "30");
    await createHolding(page, "S&P 500 ETF", "500");
    await createCard(page, "Rewards Card", "80");

    await page.goto("/dashboard");

    await expect(page.getByTestId("net-worth-headline")).toHaveText("$550.00");
  });

  test("the breakdown chart shows wallet and investment slices but never a credit card slice", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");
    await createHolding(page, "S&P 500 ETF", "500");
    await createCard(page, "Rewards Card", "80");

    await page.goto("/dashboard");

    await expect(page.getByText("Checking", { exact: true })).toBeVisible();
    await expect(page.getByText("S&P 500 ETF", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Rewards Card", { exact: true }),
    ).not.toBeVisible();
  });

  test("the net-worth summary shows the wallets, investments, and credit card totals as separate labeled values", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "130");
    await createHolding(page, "S&P 500 ETF", "500");
    await createCard(page, "Rewards Card", "80");

    await page.goto("/dashboard");

    const summary = page.getByTestId("net-worth-summary");
    await expect(summary.getByText("Wallets", { exact: true })).toBeVisible();
    await expect(
      summary.getByText("Investments", { exact: true }),
    ).toBeVisible();
    await expect(
      summary.getByText("Card balances", { exact: true }),
    ).toBeVisible();
    await expect(summary.getByText("$130.00", { exact: true })).toBeVisible();
    await expect(summary.getByText("$500.00", { exact: true })).toBeVisible();
    await expect(summary.getByText("$80.00", { exact: true })).toBeVisible();
  });
});
