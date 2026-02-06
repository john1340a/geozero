import { test, expect } from '@playwright/test';

test.describe('Mobile Filter Feature', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    // Mock APIs
    await page.route('/flux.rss', async route => {
       await route.fulfill({ status: 200, contentType: 'application/xml', body: '<rss><channel><item><title>Test Job</title></item></channel></rss>' });
    });
    await page.route('**nominatim.openstreetmap.org/**', async route => route.fulfill({ status: 200, body: '[]' }));
    await page.route('**api-adresse.data.gouv.fr/**', async route => route.fulfill({ status: 200, body: '{"features":[]}' }));
    await page.route('/communes.json', async route => route.fulfill({ status: 200, body: '[]' }));

    await page.goto('/');
  });

  test('should show filter button in header', async ({ page }) => {
    // Check if the filter button exists. 
    // We expect a button with class .mobile-filter-btn
    const filterBtn = page.locator('.mobile-filter-btn');
    await expect(filterBtn).toBeVisible();
  });

  test('should open filter overlay on click', async ({ page }) => {
    const filterBtn = page.locator('.mobile-filter-btn');
    await filterBtn.click();

    const overlay = page.locator('.mobile-filter-overlay');
    await expect(overlay).toBeVisible();

    // Check for Section Titles
    await expect(overlay.getByText('Type de contrat')).toBeVisible();
    await expect(overlay.getByText('Lieu')).toBeVisible();

    // Check for Chips
    await expect(overlay.getByRole('button', { name: 'Tous' })).toBeVisible();
    await expect(overlay.getByRole('button', { name: 'Partout' })).toBeVisible();
  });
});
