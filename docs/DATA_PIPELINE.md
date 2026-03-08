# Data Pipeline

This document describes the full data flow from file upload to structured AI analysis.

## Pipeline Overview

```
[User uploads file]
        ↓
[File validation: type, size, mime check]
  - validateFile(mimeType, size) in utils/fileValidation.ts
  - Accepted: PDF, PNG, JPG, WEBP (max 20MB)
        ↓
[POST /api/upload]
  - Saves file to ./tmp/uploads/{uuid}/original.{ext}
  - Stores DocumentMeta in server-side Map
  - Returns { docId, meta }
        ↓
[Redirect to /analyze/[docId]]
        ↓
[Client fetches file via /api/file/[docId]]
        ↓
[PDF → Canvas render (pdfjs-dist) OR direct image display]
  - PDF: pdfjs-dist renders each page to an HTML canvas, exported as PNG data URL
  - Image: FileReader converts blob to base64 data URL
        ↓
[User draws annotations on Fabric.js canvas]
  - Circle, Rectangle, Arrow, Text Label, Freehand
  - Each annotation tagged with: annotationId, semanticType, annotationColor
        ↓
[On "Analyze Document" click:]
  - AnnotationCanvasHandle.getImageDataUrl() → composite base64 PNG (doc + annotations)
  - AnnotationCanvasHandle.getAnnotations() → AnnotationObject[] with bounding boxes
  - promptBuilder.buildUserPrompt(annotationMetadata) → structured user prompt text
        ↓
[POST /api/analyze]
  Body: { imageBase64, annotationMetadata }
        ↓
[claude.ts service:]
  - buildSystemPrompt() → color → semantic meaning mapping + JSON schema instruction
  - buildUserPrompt(metadata) → per-annotation descriptions with bounding box coords
  - Construct Anthropic Messages API call:
      system: buildSystemPrompt()
      messages: [{ role: 'user', content: [imageBlock, textBlock] }]
  - Call claude-sonnet-4-20250514 with max_tokens: 2048
  - parseClaudeResponse(text) → extract JSON from response
        ↓
[Return AnalyzeResponse to frontend]
  { success, data: InsightResponse, rawText, tokenUsage }
        ↓
[AnalysisPanel renders structured results]
  - InsightResponse.insights → one card per annotation
  - InsightResponse.overall_summary → top-level summary
  - InsightResponse.flagged_risks → red-accented risk list
  - InsightResponse.follow_up_questions → clickable chips
        ↓
[Optional: follow-up chat]
  - Each chat turn: POST /api/analyze with { followUpQuestion, conversationHistory }
  - analyzeWithHistory() includes annotated image in every message turn
  - System prompt sent once (not repeated per turn)
```

## Key Data Types

| Type | File | Description |
|------|------|-------------|
| `AnnotationObject` | `types/annotations.ts` | Single annotation with ID, type, color, label, bounding box |
| `AnnotationMetadata` | `types/annotations.ts` | Collection of annotations + canvas dimensions + page number |
| `InsightResponse` | `types/analysis.ts` | Structured Claude JSON output |
| `DocumentMeta` | `types/documents.ts` | Upload metadata (docId, filename, mimeType, etc.) |
| `AnalyzeResponse` | `types/analysis.ts` | API response wrapper |

## Annotation Color Semantics

| Color | Shape Intent | Claude Instruction |
|-------|-------------|-------------------|
| Red | Circle/highlight | "Focus specifically on this value or metric" |
| Yellow | Rectangle/box | "Extract and summarize this section or table" |
| Blue | Arrow/pointer | "Analyze the trend or pattern being pointed to" |
| Green | Text label | "User-defined context — treat label as a question or instruction" |

## Token Budget

| Call type | max_tokens | Notes |
|-----------|-----------|-------|
| Initial analysis | 2048 | Full InsightResponse JSON |
| Follow-up chat | 1024 | Conversational response |

## Storage

- **Dev**: Local filesystem at `./tmp/uploads/{docId}/original.{ext}`
- **Prod**: Swap `documentStore` Map for Redis/DynamoDB and file storage for S3.
