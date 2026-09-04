import { test, expect } from "@playwright/test";

/**
 * E2E test: Wallet balance top-up prompt flow on stream creation form.
 *
 * Requirements:
 *  1. Mock the wallet balance at a value less than the stream amount
 *  2. Attempt to submit the create-stream form
 *  3. Assert the top-up banner appears with the correct shortfall amount
 *  4. Update mock balance to sufficient → assert banner dismisses
 *  5. Acceptance Criteria:
 *     - Banner appears with correct shortfall when balance is insufficient
 *     - Banner dismisses when balance becomes sufficient
 *     - Submit button remains disabled while balance is insufficient
 *     - No banner shown when balance is sufficient from the start
 */

test.describe("Create Stream - Wallet Balance Top-Up Prompt Flow", () => {
  test("top-up banner appears on insufficient balance, disables submit button, and dismisses on balance update", async ({
    page,
  }) => {
    // Set initial mock balance to 100 USDC via window object
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__MOCK_WALLET_BALANCE__ = 100;
    });

    await page.goto("/stream/new");

    // Fill recipient
    const recipientInput = page.getByTestId("recipient-input");
    await expect(recipientInput).toBeVisible();
    await recipientInput.fill("GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO");

    // Next -> Amount step
    await page.getByRole("button", { name: "Next" }).click();

    // Fill amount = 500 USDC (balance is 100, so shortfall = 400)
    const amountInput = page.getByLabel(/amount/i);
    await expect(amountInput).toBeVisible();
    await amountInput.fill("500");

    // Select duration = 1 hour
    await page.getByRole("button", { name: "1 hour" }).click();

    // Next -> Preview step
    await page.getByRole("button", { name: "Next" }).click();

    // Confirm -> Review step
    const confirmBtn = page.getByRole("button", { name: "Confirm" });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Assert top-up banner appears
    const banner = page.getByTestId("top-up-banner");
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText("Insufficient Balance");

    // Assert shortfall amount = 400
    const shortfallEl = page.getByTestId("shortfall-amount");
    await expect(shortfallEl).toContainText("400");

    // Assert submit button is disabled
    const submitBtn = page.getByTestId("confirm-sign-button");
    await expect(submitBtn).toBeDisabled();

    // Update mock balance to 600 USDC (sufficient)
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__MOCK_WALLET_BALANCE__ = 600;
      window.dispatchEvent(new CustomEvent("mock-balance-update", { detail: 600 }));
    });

    // Assert banner dismisses and submit button becomes enabled
    await expect(banner).not.toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeEnabled();
  });

  test("no top-up banner appears when initial balance is sufficient", async ({
    page,
  }) => {
    // Set initial mock balance to 1000 USDC
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__MOCK_WALLET_BALANCE__ = 1000;
    });

    await page.goto("/stream/new");

    // Fill recipient
    const recipientInput = page.getByTestId("recipient-input");
    await recipientInput.fill("GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO");
    await page.getByRole("button", { name: "Next" }).click();

    // Fill amount = 200 USDC
    const amountInput = page.getByLabel(/amount/i);
    await expect(amountInput).toBeVisible();
    await amountInput.fill("200");
    await page.getByRole("button", { name: "1 hour" }).click();

    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Confirm step review reached
    const submitBtn = page.getByTestId("confirm-sign-button");
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Assert banner is NOT shown and submit button is enabled
    const banner = page.getByTestId("top-up-banner");
    await expect(banner).not.toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
