import { expect, test } from '@playwright/test';

const PASSWORD = 'Password123!';

test('agent signs in, creates a ticket, and posts a reply', async ({ page }) => {
  // Sign in (seeded demo agent).
  await page.goto('/sign-in');
  await page.locator('input[name="email"]').fill('agent@acme.test');
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Create a ticket.
  await page.goto('/tickets/new');
  await page.locator('input[name="subject"]').fill(`E2E ticket ${Date.now()}`);
  await page.locator('textarea[name="body"]').fill('Customer cannot log in to their account.');
  await page.getByRole('button', { name: 'Create ticket' }).click();

  // Lands on the ticket detail page with the opening message.
  await expect(page).toHaveURL(/\/tickets\/.+/);
  await expect(page.getByText('Customer cannot log in to their account.')).toBeVisible();

  // Post a reply. Live SSE delivery is timing-sensitive in headless CI, so we
  // confirm the action completed (the textarea resets) then reload and assert
  // the reply persisted and renders.
  await page.locator('textarea[name="body"]').fill('Thanks — we are looking into it now.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.locator('textarea[name="body"]')).toHaveValue('');
  await page.reload();
  await expect(page.getByText('Thanks — we are looking into it now.')).toBeVisible();
});
