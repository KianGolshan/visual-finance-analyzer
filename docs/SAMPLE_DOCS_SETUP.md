# Sample Documents Setup

Place these files in `public/sample-docs/` to use them with the application.

## 1. Apple 10-K Excerpt (`apple-10k-excerpt.pdf`)

**Source**: SEC EDGAR — Apple Inc. most recent 10-K filing
**Target pages**: Consolidated Statements of Operations (typically pages 30–35)

**Steps**:
1. Go to the SEC EDGAR full-text search at https://efts.sec.gov/LATEST/search-index?q=%22apple+inc%22&dateRange=custom&startdt=2023-10-01&enddt=2024-12-31&forms=10-K
2. Open the most recent 10-K filing
3. Download the full 10-K PDF from the filing index page
4. Use a PDF editor (e.g., Adobe Acrobat, Preview on Mac, pdf-lib) to extract pages 30–35
5. Save as `public/sample-docs/apple-10k-excerpt.pdf`

**What to annotate**:
- Yellow rectangle: Net sales row (all years)
- Red circle: Most recent year's total net sales figure
- Blue arrow: From earliest to most recent year's revenue column
- Green text label: "YoY growth rate?"

---

## 2. S&P 500 Chart (`sp500-chart.png`)

**Source**: Yahoo Finance — S&P 500 1-year chart
**How to get it**:
1. Visit the Yahoo Finance S&P 500 page
2. Set the chart time range to "1Y" (1 year)
3. Take a screenshot (Mac: Cmd+Shift+4, Windows: Win+Shift+S)
4. Crop to just the chart area
5. Save as `public/sample-docs/sp500-chart.png`

**What to annotate**:
- Blue arrow: Along the main trend direction
- Red circles: On significant drawdown points or peaks
- Yellow box: Around the recent price range
- Green text: "Is this a sustainable trend?"

---

## 3. Earnings Table (`earnings-table.png`)

**Source**: Stock Analysis — NVDA or MSFT income statement
**How to get it**:
1. Visit the NVDA financials page on Stock Analysis
2. Navigate to the "Income Statement" tab
3. Set the view to "Annual"
4. Take a screenshot of the full income statement table
5. Crop to include column headers + key rows (revenue, gross profit, net income)
6. Save as `public/sample-docs/earnings-table.png`

**What to annotate**:
- Yellow box: Around the Revenue row across all years
- Red circle: On the most recent year's Revenue figure
- Blue arrow: From the year with lowest revenue to highest
- Green text: "What's driving growth?"

---

## Notes

- All three documents are intended for **educational and demonstration purposes only**
- Financial data from public SEC filings and financial data providers is publicly available
- The app accepts PNG, JPG, WEBP, and PDF formats up to 20MB
- For best Claude vision results, ensure images are clear and text is legible (at least 72 DPI)
- PDFs render at 1.5× scale for high resolution annotation

## Quick Test Without Real Documents

If you don't have the sample documents yet, you can test the app with **any screenshot** of:
- A financial table from a company's annual report website
- A stock chart from any financial website
- A spreadsheet with numerical data

The annotation semantics work with any financial document that has visible numbers, charts, or tables.
