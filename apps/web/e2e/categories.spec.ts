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

// Creates a custom category inline via the quick-add sheet's picker (the
// only creation path that exists), then leaves without submitting a
// transaction.
async function createCustomCategory(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.goto("/dashboard");
  await page.keyboard.press("n");
  await page.getByRole("button", { name: "New category" }).click();
  await page.getByPlaceholder("e.g. Groceries").fill(name);
  await page
    .getByRole("dialog", { name: "New category" })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "New category" }),
  ).not.toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Cancel" }).click();
}

test.describe("category management (/transactions/categories)", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const seeded = await seedSignedInUser(
      "Ada Lovelace",
      `categories-e2e-${crypto.randomUUID()}@example.com`,
    );
    userId = seeded.userId;
    await context.addCookies(cookieHeaderToPlaywrightCookies(seeded.cookie));
  });

  test.afterEach(async () => {
    await deleteSeededUser(userId);
  });

  test("editing a custom category's name, color, and icon updates it", async ({
    page,
  }) => {
    await createCustomCategory(page, "Side hustle");
    await page.goto("/transactions/categories");
    await expect(page.getByText("Side hustle", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Edit Side hustle" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Freelance income");
    await page.getByRole("button", { name: "Choose icon and color" }).click();
    await page.getByRole("button", { name: "landmark", exact: true }).click();
    await page.getByRole("button", { name: "#22c55e", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText("Freelance income", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Side hustle", { exact: true }),
    ).not.toBeVisible();
  });

  test("deleting an unused custom category removes it from the list", async ({
    page,
  }) => {
    await createCustomCategory(page, "To delete");
    await page.goto("/transactions/categories");
    await expect(page.getByText("To delete", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete To delete" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(
      page.getByText("To delete", { exact: true }),
    ).not.toBeVisible();
  });

  test("attempting to delete a custom category still referenced by a transaction shows an inline error and it remains", async ({
    page,
  }) => {
    await createWallet(page, "Checking", "100");

    await page.goto("/dashboard");
    await page.keyboard.press("n");
    await page.getByRole("button", { name: "Expense" }).click();
    await page.getByLabel("Amount").fill("10");
    await page.getByRole("combobox").first().click();
    await page.getByRole("button", { name: "New category" }).click();
    await page.getByPlaceholder("e.g. Groceries").fill("In use category");
    await page
      .getByRole("dialog", { name: "New category" })
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "New category" }),
    ).not.toBeVisible({ timeout: 10000 });
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: "Checking" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add transaction" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible({
      timeout: 10000,
    });

    await page.goto("/transactions/categories");
    await page.getByRole("button", { name: "Delete In use category" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(
      page.getByText(/still used by at least one transaction/i),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByText("In use category", { exact: true }),
    ).toBeVisible();
  });

  test("system categories show no edit or delete action", async ({ page }) => {
    await page.goto("/transactions/categories");

    await expect(page.getByText("Food & Dining")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit Food & Dining" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Delete Food & Dining" }),
    ).toHaveCount(0);
  });
});
