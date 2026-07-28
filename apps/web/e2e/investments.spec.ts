import { expect, test } from "@playwright/test";
import {
  cookieHeaderToPlaywrightCookies,
  deleteSeededUser,
  seedSignedInUser,
} from "./seed-session";

test.describe("investments", () => {
  let userId: string;

  test.beforeEach(async ({ context }) => {
    const seeded = await seedSignedInUser(
      "Ada Lovelace",
      `investments-e2e-${crypto.randomUUID()}@example.com`,
    );
    userId = seeded.userId;
    await context.addCookies(cookieHeaderToPlaywrightCookies(seeded.cookie));
  });

  test.afterEach(async () => {
    await deleteSeededUser(userId);
  });

  test("submitting the create-holding dialog with a name and current value calls the create mutation and the new holding appears in the list", async ({
    page,
  }) => {
    await page.goto("/investments");
    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Name", { exact: true }).fill("S&P 500 ETF");
    await page.getByLabel("Current value", { exact: true }).fill("5000");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("S&P 500 ETF", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-slot="card-content"]').getByText("$5,000.00"),
    ).toBeVisible();
  });

  test("submitting the create-holding dialog with an empty name shows a validation error and does not call the API", async ({
    page,
  }) => {
    let createRequested = false;
    await page.route("**/investments", async (route) => {
      if (route.request().method() === "POST") createRequested = true;
      await route.continue();
    });

    await page.goto("/investments");
    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Current value", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(createRequested).toBe(false);
  });

  test("the /investments page renders each holding's current value and a total equal to their sum", async ({
    page,
  }) => {
    await page.goto("/investments");

    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Bitcoin");
    await page.getByLabel("Current value", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Bitcoin", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Name", { exact: true }).fill("S&P 500 ETF");
    await page.getByLabel("Current value", { exact: true }).fill("50");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("S&P 500 ETF", { exact: true })).toBeVisible();

    await expect(page.getByText("$100.00", { exact: true })).toBeVisible();
    await expect(page.getByText("$50.00", { exact: true })).toBeVisible();
    await expect(page.getByText("Total value")).toBeVisible();
    await expect(page.getByText("$150.00", { exact: true })).toBeVisible();
  });

  test("the /investments page shows an empty state with a create affordance when there are no holdings", async ({
    page,
  }) => {
    await page.goto("/investments");

    await expect(page.getByText("No holdings yet")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create holding" }),
    ).toBeVisible();
  });

  test("a holding with a cost basis displays its gain/loss; a holding without one does not", async ({
    page,
  }) => {
    await page.goto("/investments");

    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Bitcoin");
    await page.getByLabel("Current value", { exact: true }).fill("150");
    await page.getByLabel("Cost basis", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Bitcoin", { exact: true })).toBeVisible();
    await expect(page.getByText("+$50.00", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Name", { exact: true }).fill("S&P 500 ETF");
    await page.getByLabel("Current value", { exact: true }).fill("200");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("S&P 500 ETF", { exact: true })).toBeVisible();

    const etfCard = page.locator('[data-slot="card"]', {
      has: page.getByText("S&P 500 ETF", { exact: true }),
    });
    await expect(etfCard.getByText("$200.00", { exact: true })).toBeVisible();
    await expect(etfCard.getByText(/^[+-]\$/)).toHaveCount(0);
  });

  test("updating a holding's current value updates what's displayed without changing its other fields", async ({
    page,
  }) => {
    await page.goto("/investments");
    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Bitcoin");
    await page.getByLabel("Current value", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Bitcoin", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Edit Bitcoin" }).click();
    await page.getByLabel("Current value", { exact: true }).fill("175");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Bitcoin", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-slot="card-content"]').getByText("$175.00"),
    ).toBeVisible();
  });

  test("clicking delete does not remove the holding until the confirmation dialog is confirmed", async ({
    page,
  }) => {
    await page.goto("/investments");
    await page.getByRole("button", { name: "Add holding" }).click();
    await page.getByLabel("Name", { exact: true }).fill("To delete");
    await page.getByLabel("Current value", { exact: true }).fill("10");
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

  test("the dashboard renders a link that navigates to /investments", async ({
    page,
  }) => {
    // The dashboard's header (and its Investments link) only renders once
    // the user has at least one wallet — a zero-wallet dashboard shows the
    // create-wallet empty state instead (mirrors wallets.spec.ts's
    // equivalent dashboard-link test).
    await page.goto("/wallets");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Checking");
    await page.getByLabel("Starting balance", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Checking", { exact: true })).toBeVisible();

    await page.goto("/dashboard");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Investments" })
      .click();
    await expect(page).toHaveURL(/\/investments$/);
  });
});
