# Use Case Walkthrough

## Scenario: Analyst Reviews Apple 10-K Revenue Section

### Step 1 — Upload

User opens the app at `http://localhost:3000`. The landing page shows a drag-and-drop upload zone with the headline "Annotate. Ask. Understand."

User drags `apple-10k-excerpt.pdf` onto the drop zone. The file validates successfully (PDF, under 20MB). The app uploads to `/api/upload`, receives a `docId`, and redirects to `/analyze/{docId}`.

### Step 2 — Navigate to the Right Page

The PDF loads via `pdfjs-dist` in the browser. The page navigator in the header shows "Page 1 / 6". User clicks the `›` button twice to navigate to page 3 (Consolidated Statements of Operations).

### Step 3 — Annotate

The document renders as a high-resolution background image on the Fabric.js canvas.

User selects the **Rectangle** tool and picks **yellow** from the color picker. Draws a bounding box around the entire "Net sales" row across all fiscal years.

User selects the **Circle** tool and picks **red**. Circles the most recent year's total revenue figure ($383.3B).

User selects the **Arrow** tool and picks **blue**. Draws an arrow from the FY2021 revenue column to the FY2023 revenue column, indicating the growth trajectory.

User selects the **Text Label** tool and picks **green**. Clicks near the arrow and types: "YoY growth rate?"

The annotation count badge shows **4**.

### Step 4 — Analyze

User clicks the **"Analyze Document"** button. The canvas is flattened to a single composite PNG (document + all 4 annotations rendered on top). The 4 annotation objects are serialized to JSON with their IDs, types, colors, labels, and bounding boxes.

The prompt is constructed by `promptBuilder.ts` and sent to `/api/analyze` alongside the image. Claude processes the visual document with annotation context.

### Step 5 — Results

The analysis panel renders with the following structured output:

**Overall Summary**: "Apple's revenue section reveals a period of strong growth from FY2021 to FY2022, followed by a decline in FY2023. The annotated sections highlight key revenue figures and directional trends."

**Insight 1** (yellow rectangle — `a1`):
- Region: Net sales row spanning FY2021–FY2023
- Extracted: $365.8B (2021), $394.3B (2022), $383.3B (2023)
- Insight: Revenue peaked in FY2022 then declined — this row is the most watched metric in Apple's income statement.
- Confidence: High

**Insight 2** (red circle — `a2`):
- Region: FY2023 net sales figure
- Extracted: $383.3B
- Insight: Represents a 2.8% YoY decline from FY2022, the first annual revenue decline in several years.
- Confidence: High

**Insight 3** (blue arrow — `a3`):
- Region: FY2021 to FY2023 revenue trajectory
- Extracted: +$17.5B growth from FY2021 to FY2022, then -$11.0B decline to FY2023
- Insight: Compound growth from FY2021 to FY2023 is approximately +4.8%, but the trend reversed sharply in FY2023.
- Confidence: High

**Insight 4** (green text — `a4`):
- Region: User label near FY2021–FY2023 arrow
- Extracted: YoY growth rate question
- Insight: FY2021→FY2022: +7.8%. FY2022→FY2023: -2.8%. The deceleration is significant.
- Confidence: Medium

**Flagged Risks**:
- Revenue declined in FY2023. Analyst should review product vs. services segment breakdown.
- Single-year revenue decline may indicate demand saturation in key hardware categories.

**Follow-up Questions**: ["What drove the revenue decline in FY2023?", "How does this compare to MSFT and Google?", "What does services revenue trend look like separately?"]

### Step 6 — Follow-Up

User clicks **"What drove the revenue decline in FY2023?"** — it populates the chat input and sends automatically. Claude responds referencing the same annotated image: "The FY2023 revenue decline was primarily driven by a contraction in iPhone and Mac segment revenues, partially offset by continued Services growth..."

User types a follow-up: "What was Services revenue growth?" — sends it. Claude responds with specific figures from the annotated document context.

### Step 7 — Export

User clicks **"Export as PDF"**. The browser's print dialog opens with the analysis panel visible, allowing the user to print or save as a professional PDF analysis memo.

---

## Other Use Cases

### NVDA Earnings Surprise Analysis
1. Upload NVDA earnings table screenshot
2. Yellow box around the EPS row
3. Red circle on actual EPS vs. estimate
4. Blue arrow pointing to the beat percentage
5. Green label: "Why did guidance matter more than the beat?"
6. Analyze → get insight on how the guidance revision overshadowed the EPS beat

### S&P 500 Chart Pattern Recognition
1. Upload 1-year S&P 500 chart
2. Blue arrow following the main trend line
3. Red circles on significant drawdown points
4. Yellow box around the recent recovery range
5. Analyze → get technical pattern insights + context

### Balance Sheet Health Check
1. Upload balance sheet (PDF or image)
2. Yellow boxes around debt and cash rows
3. Red circle on total liabilities
4. Blue arrow from current assets to current liabilities
5. Green label: "Current ratio healthy?"
6. Analyze → get liquidity ratio analysis + risk flags
