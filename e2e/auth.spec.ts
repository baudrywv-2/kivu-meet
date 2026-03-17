import { test, expect } from '@playwright/test';

test.describe('Auth and redirects', () => {
  test('home redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page shows sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Kivu Meet' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });

  test('discovery redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/discovery');
    await expect(page).toHaveURL(/\/login/);
  });

  test('onboarding redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/login/);
  });
});
