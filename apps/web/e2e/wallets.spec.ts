import { expect, test } from "@playwright/test";
import {
  cookieHeaderToPlaywrightCookies,
  deleteSeededUser,
  seedSignedInUser,
} from "./seed-session";

test.describe("wallets", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const seeded = await seedSignedInUser(
      "Ada Lovelace",
      `wallets-e2e-${crypto.randomUUID()}@example.com`,
    );
    userId = seeded.userId;
    await context.addCookies(cookieHeaderToPlaywrightCookies(seeded.cookie));
  });

  test.afterEach(async () => {
    await deleteSeededUser(userId);
  });

  test("submitting the create-wallet dialog with a valid name and balance calls the create mutation and the new wallet appears in the list", async ({
    page,
  }) => {
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Checking");
    await page.getByLabel("Starting balance", { exact: true }).fill("125.50");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Checking", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-slot="card-content"]').getByText("$125.50"),
    ).toBeVisible();
  });

  test("submitting the create-wallet dialog with an empty name shows a validation error and does not call the API", async ({
    page,
  }) => {
    let createRequested = false;
    await page.route("**/wallets", async (route) => {
      if (route.request().method() === "POST") createRequested = true;
      await route.continue();
    });

    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(createRequested).toBe(false);
  });

  test("the /wallets page renders each wallet's balance and a total equal to their sum", async ({
    page,
  }) => {
    await page.goto("/wallets");

    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Checking");
    await page.getByLabel("Starting balance", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Checking", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Savings");
    await page.getByLabel("Starting balance", { exact: true }).fill("50");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Savings", { exact: true })).toBeVisible();

    await expect(page.getByText("$100.00", { exact: true })).toBeVisible();
    await expect(page.getByText("$50.00", { exact: true })).toBeVisible();
    await expect(page.getByText("Net worth")).toBeVisible();
    await expect(page.getByText("$150.00", { exact: true })).toBeVisible();
  });

  test("the /wallets page shows an empty state with a create affordance when there are no wallets", async ({
    page,
  }) => {
    await page.goto("/wallets");

    await expect(page.getByText("No wallets yet")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create wallet" }),
    ).toBeVisible();
  });

  test("picking a preset color and a curated icon in the create dialog renders on the new wallet's card", async ({
    page,
  }) => {
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Savings");
    await page.getByLabel("Starting balance", { exact: true }).fill("50");

    await page.getByRole("button", { name: "Choose icon and color" }).click();
    await page.getByRole("button", { name: "landmark", exact: true }).click();
    await page.getByRole("button", { name: "#22c55e", exact: true }).click();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Savings", { exact: true })).toBeVisible();

    const appearance = page.getByTestId("wallet-appearance");
    await expect(appearance).toHaveAttribute("data-icon", "landmark");
    await expect(appearance).toHaveCSS("background-color", "rgb(34, 197, 94)");
  });

  test("entering a custom hex value in the color picker applies it to the created wallet", async ({
    page,
  }) => {
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Custom color");
    await page.getByLabel("Starting balance", { exact: true }).fill("5");

    await page.getByRole("button", { name: "Choose icon and color" }).click();
    const hexInput = page.getByLabel("Hex color");
    await hexInput.fill("");
    await hexInput.fill("#1a2b3c");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Custom color", { exact: true })).toBeVisible();

    await expect(page.getByTestId("wallet-appearance")).toHaveCSS(
      "background-color",
      "rgb(26, 43, 60)",
    );
  });

  test("editing an existing wallet's icon and color updates its card, with balance unchanged", async ({
    page,
  }) => {
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Rebrand me");
    await page.getByLabel("Starting balance", { exact: true }).fill("30");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Rebrand me", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Rename Rebrand me" }).click();
    await page.getByRole("button", { name: "Choose icon and color" }).click();
    await page.getByRole("button", { name: "bitcoin", exact: true }).click();
    await page.getByRole("button", { name: "#f97316", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save" }).click();

    const appearance = page.getByTestId("wallet-appearance");
    await expect(appearance).toHaveAttribute("data-icon", "bitcoin");
    await expect(appearance).toHaveCSS("background-color", "rgb(249, 115, 22)");
    await expect(
      page.locator('[data-slot="card-content"]').getByText("$30.00"),
    ).toBeVisible();
  });

  test("renaming a wallet updates its displayed name without changing its balance", async ({
    page,
  }) => {
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Old name");
    await page.getByLabel("Starting balance", { exact: true }).fill("42");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Old name", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Rename Old name" }).click();
    await page.getByLabel("Name", { exact: true }).fill("New name");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("New name", { exact: true })).toBeVisible();
    await expect(page.getByText("Old name", { exact: true })).not.toBeVisible();
    await expect(
      page.locator('[data-slot="card-content"]').getByText("$42.00"),
    ).toBeVisible();
  });

  test("clicking delete does not remove the wallet until the confirmation dialog is confirmed", async ({
    page,
  }) => {
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("To delete");
    await page.getByLabel("Starting balance", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("To delete", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete To delete" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText("To delete", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
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

  test("the dashboard renders a link that navigates to /wallets", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("main").getByRole("link", { name: "Wallets" }).click();
    await expect(page).toHaveURL(/\/wallets$/);
  });
});
