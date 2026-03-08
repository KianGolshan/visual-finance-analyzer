import Anthropic from '@anthropic-ai/sdk';
import type { AnnotationMetadata } from '@/types/annotations';
import type { AnalyzeResponse, ChatMessage, InsightResponse } from '@/types/analysis';
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS_ANALYSIS,
  CLAUDE_MAX_TOKENS_FOLLOWUP,
} from '@/utils/constants';
import { buildSystemPrompt, buildUserPrompt, buildFollowUpPrompt } from './promptBuilder';
import { extractBase64, extractMediaType } from './imageProcessor';

function parseClaudeResponse(text: string): { data?: InsightResponse; rawText: string } {
  try {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    const parsed = JSON.parse(jsonString) as InsightResponse;
    return { data: parsed, rawText: text };
  } catch {
    return { rawText: text };
  }
}

export async function analyzeDocument(
  imageDataUrl: string,
  annotationMetadata: AnnotationMetadata
): Promise<AnalyzeResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const base64 = extractBase64(imageDataUrl);
  const mediaType = extractMediaType(imageDataUrl) as
    | 'image/png'
    | 'image/jpeg'
    | 'image/webp'
    | 'image/gif';

  const userPrompt = buildUserPrompt(annotationMetadata);

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS_ANALYSIS,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
  });

  const rawText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  const { data, rawText: rt } = parseClaudeResponse(rawText);

  return {
    success: true,
    data,
    rawText: rt,
    tokenUsage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

export async function analyzeWithHistory(
  imageDataUrl: string,
  conversationHistory: ChatMessage[],
  followUpQuestion: string
): Promise<AnalyzeResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const base64 = extractBase64(imageDataUrl);
  const mediaType = extractMediaType(imageDataUrl) as
    | 'image/png'
    | 'image/jpeg'
    | 'image/webp'
    | 'image/gif';

  // Build messages array: include image in every turn for persistent visual context
  const messages: Anthropic.MessageParam[] = conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  messages.push({
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      },
      {
        type: 'text',
        text: buildFollowUpPrompt(followUpQuestion),
      },
    ],
  });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS_FOLLOWUP,
    system: buildSystemPrompt(),
    messages,
  });

  const rawText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  return {
    success: true,
    rawText,
    tokenUsage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
