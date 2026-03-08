# Visual Finance Analyzer

A full-stack web app where users upload financial documents, draw visual annotations on them, and submit those annotated images to Claude's vision API to extract structured financial insights.

![Demo](docs/demo.gif)

## Key Features

- **Drag-and-drop upload** — PDF, PNG, JPG, WEBP up to 20MB
- **Multi-page PDF support** — rendered client-side via pdf.js with a page navigator
- **Fabric.js annotation canvas** — circle, rectangle, arrow, text label, and freehand tools
- **Color-coded semantics** — each annotation color maps to a specific AI instruction
- **Structured JSON output** — Claude returns per-annotation insights, risks, and follow-up questions
- **Follow-up chat** — persistent image context across multi-turn conversations
- **Export** — print analysis results as PDF

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Canvas | Fabric.js v7 |
| Styling | Tailwind CSS |
| AI | Claude claude-sonnet-4-20250514 via @anthropic-ai/sdk |
| PDF | pdfjs-dist (browser-side rendering) |
| Testing | Vitest + React Testing Library + Playwright |

## Quick Start

```bash
git clone <repo-url>
cd visual-finance-analyzer
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start dev server (also copies pdf.js worker to public/)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key | Yes |
| `MAX_FILE_SIZE_MB` | Max upload size in MB (default: 20) | No |
| `UPLOAD_DIR` | Upload directory path (default: ./tmp/uploads) | No |
| `NEXT_PUBLIC_APP_URL` | App base URL | No |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                   # Landing / upload page
│   ├── analyze/[docId]/page.tsx   # Annotation canvas + results page
│   └── api/
│       ├── upload/route.ts        # File upload + in-memory metadata store
│       ├── analyze/route.ts       # Claude API call handler
│       └── file/[docId]/route.ts  # Serves uploaded files
├── components/
│   ├── upload/DropZone.tsx        # Drag-and-drop file upload
│   ├── canvas/AnnotationCanvas.tsx # Fabric.js canvas wrapper (SSR-safe)
│   ├── canvas/AnnotationToolbar.tsx # Tool + color picker UI
│   └── results/AnalysisPanel.tsx  # Structured results display
├── services/
│   ├── claude.ts                  # Anthropic SDK calls
│   ├── imageProcessor.ts          # Base64 extraction + annotation serialization
│   └── promptBuilder.ts           # Visual prompt construction
├── types/                         # Shared TypeScript types
└── utils/                         # File validation + constants
```

## How It Works

1. **Upload** — file is validated, saved to `./tmp/uploads/{uuid}/`, metadata stored in a server-side Map
2. **Render** — PDFs are rendered client-side by pdfjs-dist; images are loaded directly onto the Fabric.js canvas
3. **Annotate** — users draw shapes with semantic color coding (red = focus, yellow = extract, blue = trend, green = question)
4. **Analyze** — the annotated canvas is flattened to a base64 image; annotation metadata is serialized; both are sent to Claude
5. **Results** — Claude returns structured JSON with per-annotation insights, overall summary, flagged risks, and follow-up questions

## Testing

```bash
# Unit + component tests
npm run test

# With coverage report
npm run test:coverage

# E2E tests (requires dev server running or will start one)
npm run test:e2e

# E2E with Playwright UI
npm run test:e2e:ui
```

**Coverage targets**: Services 90%+, Utils 100%, Components 80%+

## Visual Prompt Engineering Guide

The annotation system is a visual prompt engineering layer — the spatial context of drawn shapes meaningfully shapes what Claude extracts. See [docs/PROMPT_ENGINEERING_GUIDE.md](docs/PROMPT_ENGINEERING_GUIDE.md) for the full design rationale and optimization strategies.

## Sample Documents

See [docs/SAMPLE_DOCS_SETUP.md](docs/SAMPLE_DOCS_SETUP.md) for instructions on obtaining and placing test documents in `public/sample-docs/`.

## Architecture Notes

- No database — document metadata stored in a `Map<string, DocumentMeta>` (suitable for demo; swap for Redis/Postgres in production)
- Fabric.js imported dynamically inside `useEffect` to avoid Next.js SSR issues
- Claude API key is only accessed server-side (never exposed to the client)
- File storage is local filesystem in dev — swap `writeFile` for S3 `putObject` in production

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Write tests alongside your changes
4. Ensure `npm run test` and `npm run type-check` pass
5. Open a pull request

## License

MIT
