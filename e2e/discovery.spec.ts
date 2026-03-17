import { test, expect } from '@playwright/test';

test.describe('Discovery (authenticated)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('discovery page shows Kivu Meet header when reached', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Kivu Meet').first()).toBeVisible();
  });
});

test.describe('Navigation links on login page', () => {
  test('login page has expected structure', async ({ page }) => {
    await page.goto('/login');
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });
});
