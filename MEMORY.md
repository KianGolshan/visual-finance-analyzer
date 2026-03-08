# MEMORY.md — Visual Finance Analyzer

## Architecture Decisions

- Using Fabric.js over Konva because Fabric has better TypeScript support and built-in serialization (toJSON/loadFromJSON)
- PDF rendering done client-side with pdfjs-dist to avoid server-side binary deps
- Claude API calls go through /api/analyze route (not direct from client) to keep API key server-side
- All annotation metadata uses Fabric.js native object schema extended with custom `annotationId`, `semanticType`, `annotationColor`, and `label` fields set directly on objects
- No database — document metadata stored in a server-side Map (suitable for demo; swap for Redis/Postgres in prod)
- Fabric.js imported dynamically inside `useEffect` (not at module level) — required for Next.js SSR compatibility
- pdf.js worker copied from node_modules to public/ via npm predev/prebuild scripts, served at /pdf.worker.min.mjs
- Undo/redo implemented as a simple remove-last / restore-from-stack approach (not JSON snapshot) for simplicity

## Key File Locations

| Purpose | Path |
|---------|------|
| Landing page | src/app/page.tsx |
| Analyze page | src/app/analyze/[docId]/page.tsx |
| Upload API | src/app/api/upload/route.ts |
| Analyze API | src/app/api/analyze/route.ts |
| File serving API | src/app/api/file/[docId]/route.ts |
| Canvas component | src/components/canvas/AnnotationCanvas.tsx |
| Toolbar component | src/components/canvas/AnnotationToolbar.tsx |
| Results panel | src/components/results/AnalysisPanel.tsx |
| Drop zone | src/components/upload/DropZone.tsx |
| Claude service | src/services/claude.ts |
| Image processor | src/services/imageProcessor.ts |
| Prompt builder | src/services/promptBuilder.ts |
| Types | src/types/annotations.ts, analysis.ts, documents.ts |
| Utils | src/utils/fileValidation.ts, constants.ts |

## Key Types

- `AnnotationObject`: { annotationId, semanticType: AnnotationType, color: AnnotationColor, label?, boundingBox, fabricData? }
- `AnnotationType`: 'circle' | 'rectangle' | 'arrow' | 'text' | 'freehand'
- `AnnotationColor`: 'red' | 'yellow' | 'blue' | 'green'
- `InsightResponse`: Claude JSON response (see types/analysis.ts)
- `DocumentMeta`: { docId, originalFileName, uploadedAt, mimeType, pageCount, filePath, fileSize }
- `AnnotationCanvasHandle`: { getImageDataUrl, getAnnotations, undo, redo, clear }

## Claude Prompt Strategy

- System prompt sent once per session, defines annotation color → semantic meaning mapping
- Each API call includes: system prompt + annotated composite image (base64) + annotation metadata JSON as user message
- Follow-up turns: append new user text + image in every turn for persistent visual context
- Max tokens: 2048 for initial analysis, 1024 for follow-ups
- Model: claude-sonnet-4-20250514

## Token Optimization Decisions

- Annotation metadata sent as compact single-line descriptions (no JSON whitespace)
- System prompt uses full descriptions but is sent only once
- Follow-up chat does NOT resend system prompt — it's in the system field on every call
- Image resized to max 1568px wide before base64 encoding (Claude's optimal vision resolution) — handled in imageProcessor.ts

## Test Strategy

- Unit: Vitest for all services and utils
- Component: React Testing Library for UI components
- E2E: Playwright against local dev server
- Mock: Claude API mocked in unit/integration tests via vi.mock, only called in E2E
- Fabric.js mocked entirely in component tests (jsdom can't run canvas APIs)
- Test setup: src/test-setup.ts patches HTMLCanvasElement.getContext and toDataURL for jsdom

## Known Gotchas

- Fabric.js and Next.js SSR: import Fabric with `import('fabric')` inside `useEffect` only — never at module top level
- pdf.js worker: must be at /pdf.worker.min.mjs in public/ — copied from node_modules via npm scripts
- Canvas toDataURL() requires CORS-clean image sources — local files only in dev
- Claude vision: images must be under 5MB base64 encoded; compress if needed (resizeImageForClaude in imageProcessor.ts)
- AnnotationCanvas uses forwardRef + useImperativeHandle to expose handle methods to parent
- activeTool and activeColor are tracked via refs inside the canvas event handlers to avoid stale closures
- In Fabric.js v7: use `opt.pointer` (not `getPointer(e)`) in mouse event handlers

## npm Scripts

```
dev           → copies pdf.worker.min.mjs then starts Next.js dev server
build         → copies pdf.worker.min.mjs then builds
test          → vitest run (unit + component tests)
test:coverage → vitest run --coverage
test:e2e      → playwright test (starts dev server automatically)
type-check    → tsc --noEmit
```

## Future Features Backlog

- [ ] Annotation template library (save/load from localStorage)
- [ ] Multi-document comparison mode
- [ ] S3 storage swap for production
- [ ] User accounts + analysis history
- [ ] Batch analyze multiple pages at once
- [ ] Export annotated image + analysis as .pptx slide
- [ ] shadcn/ui component integration (Radix UI already installed)
