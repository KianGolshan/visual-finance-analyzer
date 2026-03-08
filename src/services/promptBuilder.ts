import type { AnnotationMetadata, AnnotationObject } from '@/types/annotations';
import { ANNOTATION_SEMANTIC_MAP } from '@/utils/constants';

const SYSTEM_PROMPT = `You are a financial document analyst. The user has uploaded a financial document and annotated it with visual markers. Each annotation type carries semantic meaning:
- RED CIRCLE/SHAPE: "Focus specifically on this value or metric"
- YELLOW RECTANGLE/SHAPE: "Extract and summarize this section or table"
- BLUE ARROW/SHAPE: "Analyze the trend or pattern being pointed to"
- GREEN TEXT LABEL: "User-defined context — treat label as a question or instruction"

Respond ONLY in valid JSON matching this schema:
{
  "annotations_processed": number,
  "insights": [
    {
      "annotation_id": string,
      "annotation_type": string,
      "region_description": string,
      "extracted_value_or_trend": string,
      "financial_insight": string,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "overall_summary": string,
  "flagged_risks": string[],
  "follow_up_questions": string[]
}`;

const FALLBACK_PROMPT =
  'No annotations were provided. Please describe the key financial metrics, trends, and risks visible in this document.';

function buildAnnotationDescription(annotation: AnnotationObject): string {
  const semantic = ANNOTATION_SEMANTIC_MAP[annotation.color];
  const label = annotation.label ? ` Label: "${annotation.label}"` : '';
  const box = annotation.boundingBox;
  return `ID:${annotation.annotationId} Type:${annotation.semanticType} Color:${annotation.color} Meaning:"${semantic}"${label} BBox:[left:${Math.round(box.left)},top:${Math.round(box.top)},w:${Math.round(box.width)},h:${Math.round(box.height)}]`;
}

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildUserPrompt(metadata: AnnotationMetadata): string {
  if (!metadata.annotations || metadata.annotations.length === 0) {
    return FALLBACK_PROMPT;
  }

  const annotationDescriptions = metadata.annotations
    .map(buildAnnotationDescription)
    .join('\n');

  return `Analyze the annotated financial document. Page ${metadata.documentPage}. Canvas: ${metadata.canvasWidth}x${metadata.canvasHeight}px.

Annotations (${metadata.annotations.length} total):
${annotationDescriptions}

For each annotation, provide the insight in the JSON schema specified.`;
}

export function buildFollowUpPrompt(question: string): string {
  return `Follow-up question about the same annotated document: ${question}`;
}
