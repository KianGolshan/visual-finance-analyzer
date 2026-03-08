# Visual Prompt Engineering Guide

This guide explains the visual prompt engineering system at the core of this application.

## What Is Visual Prompt Engineering?

Traditional prompt engineering works with text. Visual prompt engineering uses the *spatial context* of annotations drawn on a document as part of the prompt itself. When you circle a number on a financial statement, that circle is not just decoration — it's an instruction to the model: "pay close attention to this specific value."

## How It Works

### 1. The Annotation Layer

When a user draws on the document canvas, each annotation carries:
- **Type**: circle, rectangle, arrow, text label, freehand
- **Color**: red, yellow, blue, or green (each maps to a semantic meaning)
- **Bounding box**: pixel coordinates on the canvas (left, top, width, height)
- **Label**: optional text attached to the annotation
- **ID**: unique identifier so results can be traced back to the specific annotation

### 2. The System Prompt (Constant Context)

Sent once per session, defines the semantic color→meaning mapping:

```
You are a financial document analyst. The user has uploaded a financial document
and annotated it with visual markers. Each annotation type carries semantic meaning:

- RED CIRCLE/SHAPE: "Focus specifically on this value or metric"
- YELLOW RECTANGLE/SHAPE: "Extract and summarize this section or table"
- BLUE ARROW/SHAPE: "Analyze the trend or pattern being pointed to"
- GREEN TEXT LABEL: "User-defined context — treat label as a question or instruction"

Respond ONLY in valid JSON matching this schema: { ... }
```

### 3. The User Prompt (Per-Request Context)

Built by `promptBuilder.ts` for each analysis request:

```
Analyze the annotated financial document. Page 3. Canvas: 900x650px.

Annotations (4 total):
ID:a1b2 Type:rectangle Color:yellow Meaning:"Extract and summarize this section" BBox:[left:120,top:200,w:640,h:45]
ID:c3d4 Type:circle Color:red Meaning:"Focus specifically on this value" BBox:[left:650,top:200,w:80,h:45]
ID:e5f6 Type:arrow Color:blue Meaning:"Analyze the trend or pattern" BBox:[left:140,top:250,w:500,h:15]
ID:g7h8 Type:text Color:green Meaning:"User-defined context" Label:"YoY growth rate?" BBox:[left:140,top:270,w:120,h:20]

For each annotation, provide the insight in the JSON schema specified.
```

### 4. The Image Block

The annotated canvas (document + annotations merged) is sent as a base64-encoded PNG image alongside the text prompt. Claude uses both to produce annotation-specific insights.

## Token Optimization Strategies

1. **Compact annotation serialization**: No whitespace in the annotation descriptions. Abbreviations for field names.
2. **System prompt sent once**: In follow-up chat, only new messages are appended. The system context is not repeated.
3. **Image resized to max 1568px**: Claude's optimal vision resolution. Larger images don't improve accuracy but increase tokens.
4. **Structured JSON output**: By instructing Claude to respond in JSON, we avoid verbose prose and ensure parseable output.
5. **Max tokens bounded**: 2048 for initial analysis (needs full JSON), 1024 for follow-ups (conversational).

## Design Principles

### Semantic Color Coding
Colors provide a consistent vocabulary between user and model. Red = urgency/focus. Yellow = extraction. Blue = directionality/trends. Green = user questions.

### Bounding Box Grounding
Providing pixel coordinates in the prompt grounds the model's response to specific regions. Without coordinates, the model might describe the wrong part of the document.

### Annotation ID Tracking
Every annotation gets a UUID. The model's response references this ID for each insight, enabling the UI to link results back to the visual annotation.

### Graceful Degradation
If no annotations are provided, the system falls back to a generic document analysis prompt. This ensures the app is useful even without annotations.

## Example Effective Patterns

### "Revenue Row Extractor"
- Yellow rectangle around the "Net sales" row
- Red circle on the most recent year's figure
- Blue arrow from prior year to current year

### "Trend Identifier"
- Blue arrow following the chart trend line
- Red circle on the peak or trough
- Green text label: "Is this trend sustainable?"

### "Risk Scanner"
- Red circles on multiple figures that look anomalous
- Green text label: "Why did this change?"

## Anti-Patterns to Avoid

- **Too many annotations**: >10 annotations dilutes focus. Keep it to the most important regions.
- **Overlapping annotations**: Spatial ambiguity confuses the model. Use distinct regions.
- **Vague text labels**: "This" or "Look here" as labels don't add value. Use specific questions.
- **Wrong color semantics**: Using a blue arrow to "focus" on a value (that's red's job) reduces response quality.
