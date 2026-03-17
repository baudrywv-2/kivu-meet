import { test, expect } from '@playwright/test';

/**
 * Full flow: login → onboarding → discovery → matches → chat.
 * Requires env: TEST_USER_EMAIL, TEST_USER_PASSWORD (and a Supabase project with this user).
 * Skip when credentials are not set.
 */
test.describe('Full flow (login → onboarding → discovery → chat)', () => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!email || !password) {
      testInfo.skip();
    }
  });

  test('can sign in and reach discovery or onboarding', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Kivu Meet' })).toBeVisible();

    await page.getByPlaceholder('Email').fill(email!);
    await page.getByPlaceholder('Password').fill(password!);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/(discovery|onboarding)/, { timeout: 10000 });
  });

  test('signed-in user can navigate discovery → matches → profile → settings', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(email!);
    await page.getByPlaceholder('Password').fill(password!);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(discovery|onboarding)/, { timeout: 10000 });

    if (page.url().includes('/onboarding')) {
      await expect(page.getByText(/Create your profile|Step 1/)).toBeVisible({ timeout: 5000 });
      return;
    }

    await expect(page).toHaveURL(/\/discovery/);
    await page.getByRole('link', { name: 'Matches' }).click();
    await expect(page).toHaveURL(/\/matches/);
    await expect(page.getByRole('heading', { name: 'Matches' }).or(page.getByText('No matches yet'))).toBeVisible({ timeout: 5000 });

    await page.goto('/discovery');
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/profile/);

    await page.goto('/discovery');
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('from matches can open a chat when matches exist', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(email!);
    await page.getByPlaceholder('Password').fill(password!);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(discovery|onboarding)/, { timeout: 10000 });
    if (page.url().includes('/onboarding')) return;

    await page.goto('/matches');
    await expect(page).toHaveURL(/\/matches/);
    const chatLink = page.locator('a[href^="/chat/"]').first();
    const count = await chatLink.count();
    if (count > 0) {
      await chatLink.click();
      await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/);
      await expect(page.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 5000 });
    }
  });
});
