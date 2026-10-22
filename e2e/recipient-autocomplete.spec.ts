import { test, expect } from '@playwright/test';

/**
 * Wallet addresses must never be offered by the browser's native autocomplete,
 * since previously-entered addresses would leak to anyone using the device.
 */

const PARTIAL_ADDRESS = 'GBKLYONWFB';

test.describe('Recipient address autocomplete', () => {
  test('create-stream recipient input disables browser autocomplete', async ({ page }) => {
    await page.goto('/stream/new');
    const input = page.getByTestId('recipient-input');
    await expect(input).toBeVisible();

    await expect(input).toHaveAttribute('autocomplete', 'off');
    await expect(input).toHaveAttribute('autocorrect', 'off');
    await expect(input).toHaveAttribute('spellcheck', 'false');

    // Enclosing form must not re-enable autocomplete for the field.
    const formAutocomplete = await input.evaluate(
      (el) => (el as HTMLInputElement).form?.getAttribute('autocomplete') ?? null,
    );
    expect(formAutocomplete).not.toBe('on');

    // Typing a partial address must not surface any suggestions: no native
    // datalist is attached and the app's own listbox has no options (the
    // address book is empty in a fresh browser context).
    await input.pressSequentially(PARTIAL_ADDRESS);
    await expect(input).toHaveValue(PARTIAL_ADDRESS);
    expect(await input.getAttribute('list')).toBeNull();
    await expect(page.locator('#recipient-listbox [role="option"]')).toHaveCount(0);
  });

  test('address book contact input disables browser autocomplete', async ({ page }) => {
    await page.goto('/address-book');
    // Form is behind the "+ Add Contact" toggle.
    await page.getByRole('button', { name: /add contact/i }).first().click();
    const input = page.locator('#contact-address');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('autocomplete', 'off');

    await input.pressSequentially(PARTIAL_ADDRESS);
    expect(await input.getAttribute('list')).toBeNull();
  });
});
