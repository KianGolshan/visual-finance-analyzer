import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mockCreate is defined before vi.mock factory runs
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  // Must use regular function (not arrow) so `new Anthropic()` works as a constructor
  default: vi.fn(function () {
    return { messages: { create: mockCreate } };
  }),
}));

import { analyzeDocument, analyzeWithHistory } from './claude';
import type { AnnotationMetadata } from '@/types/annotations';

const sampleMetadata: AnnotationMetadata = {
  annotations: [
    {
      annotationId: 'a1',
      semanticType: 'circle',
      color: 'red',
      boundingBox: { left: 10, top: 20, width: 50, height: 50 },
    },
  ],
  canvasWidth: 800,
  canvasHeight: 600,
  documentPage: 1,
};

const validInsightResponse = {
  annotations_processed: 1,
  insights: [
    {
      annotation_id: 'a1',
      annotation_type: 'circle',
      region_description: 'Revenue figure',
      extracted_value_or_trend: '$383.3B',
      financial_insight: 'Total net sales for FY2023',
      confidence: 'high',
    },
  ],
  overall_summary: 'Document analyzed.',
  flagged_risks: [],
  follow_up_questions: ['What drove changes?'],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

describe('analyzeDocument', () => {
  it('constructs messages array with image block', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validInsightResponse) }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const imageDataUrl = 'data:image/png;base64,abc123';
    await analyzeDocument(imageDataUrl, sampleMetadata);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content[0].type).toBe('image');
    expect(callArgs.messages[0].content[0].source.type).toBe('base64');
  });

  it('uses correct media_type for PNG image', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validInsightResponse) }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await analyzeDocument('data:image/png;base64,abc123', sampleMetadata);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content[0].source.media_type).toBe('image/png');
  });

  it('parses valid JSON response correctly', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validInsightResponse) }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await analyzeDocument('data:image/png;base64,abc', sampleMetadata);

    expect(result.success).toBe(true);
    expect(result.data?.annotations_processed).toBe(1);
    expect(result.data?.insights).toHaveLength(1);
  });

  it('handles malformed JSON gracefully by returning rawText', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Not valid JSON at all!' }],
      usage: { input_tokens: 50, output_tokens: 20 },
    });

    const result = await analyzeDocument('data:image/png;base64,abc', sampleMetadata);

    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
    expect(result.rawText).toBe('Not valid JSON at all!');
  });

  it('logs token usage in response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validInsightResponse) }],
      usage: { input_tokens: 500, output_tokens: 300 },
    });

    const result = await analyzeDocument('data:image/png;base64,abc', sampleMetadata);

    expect(result.tokenUsage?.inputTokens).toBe(500);
    expect(result.tokenUsage?.outputTokens).toBe(300);
  });

  it('parses JSON wrapped in markdown code block', async () => {
    const wrapped = `\`\`\`json\n${JSON.stringify(validInsightResponse)}\n\`\`\``;
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: wrapped }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await analyzeDocument('data:image/png;base64,abc', sampleMetadata);
    expect(result.data?.annotations_processed).toBe(1);
  });
});

describe('analyzeWithHistory', () => {
  it('appends follow-up question as user message', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Services revenue grew 16% YoY.' }],
      usage: { input_tokens: 300, output_tokens: 100 },
    });

    const history = [{ role: 'assistant' as const, content: 'Initial analysis here.' }];
    const result = await analyzeWithHistory('data:image/png;base64,abc', history, 'What about services?');

    expect(result.success).toBe(true);
    expect(result.rawText).toBe('Services revenue grew 16% YoY.');
  });

  it('includes image in the follow-up message', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Follow-up response.' }],
      usage: { input_tokens: 200, output_tokens: 80 },
    });

    await analyzeWithHistory('data:image/jpeg;base64,imgdata', [], 'Explain the trend.');

    const callArgs = mockCreate.mock.calls[0][0];
    const lastMessage = callArgs.messages[callArgs.messages.length - 1];
    const imageBlock = lastMessage.content.find((c: { type: string }) => c.type === 'image');
    expect(imageBlock).toBeDefined();
    expect(imageBlock.source.media_type).toBe('image/jpeg');
  });

  it('returns token usage for follow-up', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Answer.' }],
      usage: { input_tokens: 150, output_tokens: 60 },
    });

    const result = await analyzeWithHistory('data:image/png;base64,abc', [], 'Q?');
    expect(result.tokenUsage?.inputTokens).toBe(150);
    expect(result.tokenUsage?.outputTokens).toBe(60);
  });
});
