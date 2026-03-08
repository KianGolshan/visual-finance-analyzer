import { test, expect } from '@playwright/test';

// Minimal 1×1 PNG
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

async function uploadAndNavigate(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({
    name: 'sp500-chart.png',
    mimeType: 'image/png',
    buffer: PNG_BUFFER,
  });
  await page.waitForURL(/\/analyze\//, { timeout: 10_000 });
}

test.describe('Annotation and Analysis', () => {
  test('analyze page has annotation toolbar with all 5 tools', async ({ page }) => {
    await uploadAndNavigate(page);
    await expect(page.getByTestId('tool-circle')).toBeVisible();
    await expect(page.getByTestId('tool-rectangle')).toBeVisible();
    await expect(page.getByTestId('tool-arrow')).toBeVisible();
    await expect(page.getByTestId('tool-text')).toBeVisible();
    await expect(page.getByTestId('tool-freehand')).toBeVisible();
  });

  test('annotation count badge starts at 0', async ({ page }) => {
    await uploadAndNavigate(page);
    const badge = page.getByTestId('annotation-count');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('0');
  });

  test('clicking a tool sets it active', async ({ page }) => {
    await uploadAndNavigate(page);
    await page.getByTestId('tool-circle').click();
    const circleBtn = page.getByTestId('tool-circle');
    await expect(circleBtn).toHaveClass(/active-tool/);
  });

  test('analyze button is visible', async ({ page }) => {
    await uploadAndNavigate(page);
    await expect(page.getByTestId('analyze-button')).toBeVisible();
    await expect(page.getByTestId('analyze-button')).toHaveText(/analyze document/i);
  });

  test('analyze button shows loading state when clicked', async ({ page }) => {
    await uploadAndNavigate(page);

    // Mock the API to delay response
    await page.route('/api/analyze', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            annotations_processed: 0,
            insights: [],
            overall_summary: 'No annotations provided.',
            flagged_risks: [],
            follow_up_questions: ['What is the overall trend?'],
          },
          rawText: '{}',
          tokenUsage: { inputTokens: 100, outputTokens: 50 },
        }),
      });
    });

    await page.getByTestId('analyze-button').click();
    await expect(page.getByTestId('analyze-button')).toHaveText(/analyzing/i);
  });

  test('analysis results panel renders after successful analysis', async ({ page }) => {
    await uploadAndNavigate(page);

    await page.route('/api/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            annotations_processed: 1,
            insights: [
              {
                annotation_id: 'a1',
                annotation_type: 'rectangle',
                region_description: 'Full chart view',
                extracted_value_or_trend: 'Upward trend in S&P 500',
                financial_insight: 'Market showed strong recovery in H2.',
                confidence: 'high',
              },
            ],
            overall_summary: 'S&P 500 showed an overall upward trend.',
            flagged_risks: ['Volatility spike in October'],
            follow_up_questions: ['What caused the volatility?'],
          },
          rawText: '{}',
          tokenUsage: { inputTokens: 200, outputTokens: 100 },
        }),
      })
    );

    await page.getByTestId('analyze-button').click();
    await expect(page.getByTestId('analysis-panel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/S&P 500 showed an overall upward trend/i)).toBeVisible();
  });

  test('export as PDF button is present after analysis', async ({ page }) => {
    await uploadAndNavigate(page);

    await page.route('/api/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            annotations_processed: 0,
            insights: [],
            overall_summary: 'Document analyzed.',
            flagged_risks: [],
            follow_up_questions: [],
          },
          rawText: '{}',
          tokenUsage: { inputTokens: 100, outputTokens: 50 },
        }),
      })
    );

    await page.getByTestId('analyze-button').click();
    await expect(page.getByTestId('export-pdf-button')).toBeVisible({ timeout: 10_000 });
  });

  test('follow-up question chip triggers chat', async ({ page }) => {
    await uploadAndNavigate(page);

    await page.route('/api/analyze', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            annotations_processed: 0,
            insights: [],
            overall_summary: 'Document analyzed.',
            flagged_risks: [],
            follow_up_questions: ['What drove revenue decline?'],
          },
          rawText: '{"overall_summary":"Document analyzed."}',
          tokenUsage: { inputTokens: 100, outputTokens: 50 },
        }),
      })
    );

    await page.getByTestId('analyze-button').click();
    await expect(page.getByTestId('follow-up-question-0')).toBeVisible({ timeout: 10_000 });
  });
});
