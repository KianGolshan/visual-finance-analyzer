import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Upload Flow', () => {
  test('landing page renders upload zone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('drop-zone')).toBeVisible();
    await expect(page.getByText(/drop your document here/i)).toBeVisible();
  });

  test('shows error for invalid file type', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('fake-exe-content'),
    });
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText(/unsupported file type/i);
  });

  test('uploads a PNG image and redirects to analyze page', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');

    // Create a minimal 1x1 PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    await fileInput.setInputFiles({
      name: 'test-chart.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    // Should redirect to analyze page
    await page.waitForURL(/\/analyze\//, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/analyze\//);
  });

  test('redirected analyze page shows document filename', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');

    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    await fileInput.setInputFiles({
      name: 'earnings-report.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    await page.waitForURL(/\/analyze\//, { timeout: 10_000 });
    await expect(page.getByText('earnings-report.png')).toBeVisible({ timeout: 5_000 });
  });

  test('analyze page renders annotation toolbar', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    await fileInput.setInputFiles({ name: 'chart.png', mimeType: 'image/png', buffer: pngBuffer });
    await page.waitForURL(/\/analyze\//, { timeout: 10_000 });
    await expect(page.getByTestId('annotation-toolbar')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Upload validation', () => {
  test('rejects file over 20MB', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    // Create a ~21MB buffer
    const bigBuffer = Buffer.alloc(21 * 1024 * 1024, 0);
    await fileInput.setInputFiles({
      name: 'huge-file.png',
      mimeType: 'image/png',
      buffer: bigBuffer,
    });
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText(/exceeds/i);
  });
});
