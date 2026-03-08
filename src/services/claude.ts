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
  // Try fenced code block first, then bare JSON object
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const bare = text.match(/\{[\s\S]*\}/);
  const candidates = [fenced?.[1], bare?.[0]].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as InsightResponse;
      if (parsed && typeof parsed === 'object') {
        return { data: parsed, rawText: text };
      }
    } catch {
      // try next candidate
    }
  }
  return { rawText: text };
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

  // Prior turns are text-only (image already sent in the initial analysis turn).
  // The new user message re-attaches the image so Claude retains visual context.
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
