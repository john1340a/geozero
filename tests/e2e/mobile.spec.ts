import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation & Map', () => {
  // Enforce mobile viewport
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    // Mock RSS to avoid parsing errors or empty states
    await page.route('/flux.rss', async route => {
       await route.fulfill({ status: 200, contentType: 'application/xml', body: '<rss><channel><item><title>[CDI] Dev - Paris (75)</title><description>Desc</description></item></channel></rss>' });
    });

    // Mock Nominatim & BAN to prevent external network errors
    await page.route('**nominatim.openstreetmap.org/**', async route => route.fulfill({ status: 200, body: '[]' }));
    await page.route('**api-adresse.data.gouv.fr/**', async route => route.fulfill({ status: 200, body: '{"features":[]}' }));
    await page.route('/communes.json', async route => route.fulfill({ status: 200, body: '[]' }));

    await page.goto('/');
    // Ensure we are in mobile view if running in non-mobile project, 
    // but the project config should handle this.
  });

  test('should display mobile header and nav bar', async ({ page }) => {
    await expect(page.locator('.mobile-header')).toBeVisible();
    await expect(page.locator('.mobile-logo')).toBeVisible();
    await expect(page.locator('.mobile-nav')).toBeVisible();
  });

  test('should navigate to Map and display it', async ({ page }) => {
    // 1. Initial State: Map hidden
    const mapWrapper = page.locator('.map-wrapper');
    await expect(mapWrapper).not.toBeVisible();

    // 2. Click "Carte" button
    await page.getByTestId('mobile-nav-map').click();

    // 3. Verify Map is now visible
    await expect(page.locator('.content-area')).toHaveClass(/mobile-visible/);
    await expect(mapWrapper).toBeVisible();
  });

  test('should fix navigation bug: Saved -> Map', async ({ page }) => {
    // 1. Go to "Favoris" (Saved)
    await page.getByTestId('mobile-nav-saved').click();

    // Verify we are on Saved page
    await expect(page.locator('text=Offres sauvegardées')).toBeVisible();

    // 2. Click "Carte" directly
    await page.getByTestId('mobile-nav-map').click();

    // 3. Should switch to Home AND show Map
    await expect(page.locator('text=Offres sauvegardées')).not.toBeVisible();
    await expect(page.locator('.content-area')).toHaveClass(/mobile-visible/);
    await expect(page.locator('.map-wrapper')).toBeVisible();
  });
});
