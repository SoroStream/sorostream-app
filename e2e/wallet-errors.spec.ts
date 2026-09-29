import { test, expect } from '@playwright/test';

/**
 * E2E tests for wallet connection failure scenarios.
 *
 * The test browser has no Freighter extension, so every connection attempt
 * exercises the "extension missing" error path.
 *
 * Covers:
 *  1. Missing extension surfaces the install prompt instead of crashing
 *  2. A stale "connected" flag with no extension does not show an address
 *  3. Corrupt wallet localStorage values do not break page rendering
 */

test.describe('Wallet connection – error scenarios', () => {
  test('shows install prompt when Freighter is not available', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(
      page.getByRole('link', { name: /install freighter wallet extension/i }).first(),
    ).toBeVisible();
  });

  test('stale session flag without extension does not show a connected address', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sorostream_wallet_connected', 'true');
    });
    await page.goto('/dashboard');

    await expect(page.getByLabel(/connected wallet/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /disconnect/i })).not.toBeVisible();
  });

  test('corrupt wallet storage does not crash the page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.addInitScript(() => {
      localStorage.setItem('sorostream_wallet_connected', '{not-json');
    });
    await page.goto('/dashboard');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: /something went wrong/i })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
