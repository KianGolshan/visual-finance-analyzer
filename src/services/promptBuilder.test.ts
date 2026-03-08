import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, buildFollowUpPrompt } from './promptBuilder';
import type { AnnotationMetadata } from '@/types/annotations';

const makeMetadata = (overrides: Partial<AnnotationMetadata> = {}): AnnotationMetadata => ({
  annotations: [],
  canvasWidth: 800,
  canvasHeight: 600,
  documentPage: 1,
  ...overrides,
});

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('includes JSON schema instruction', () => {
    expect(buildSystemPrompt()).toContain('valid JSON');
  });

  it('describes annotation color semantics', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('RED');
    expect(prompt).toContain('YELLOW');
    expect(prompt).toContain('BLUE');
    expect(prompt).toContain('GREEN');
  });
});

describe('buildUserPrompt', () => {
  it('returns graceful fallback for 0 annotations', () => {
    const prompt = buildUserPrompt(makeMetadata());
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('never throws regardless of input', () => {
    expect(() => buildUserPrompt(makeMetadata())).not.toThrow();
    expect(() =>
      buildUserPrompt(
        makeMetadata({
          annotations: [
            {
              annotationId: 'a1',
              semanticType: 'circle',
              color: 'red',
              boundingBox: { left: 10, top: 20, width: 50, height: 50 },
            },
          ],
        })
      )
    ).not.toThrow();
  });

  it('includes "Focus specifically" for a red circle annotation', () => {
    const metadata = makeMetadata({
      annotations: [
        {
          annotationId: 'a1',
          semanticType: 'circle',
          color: 'red',
          boundingBox: { left: 10, top: 20, width: 50, height: 50 },
        },
      ],
    });
    const prompt = buildUserPrompt(metadata);
    expect(prompt).toContain('Focus specifically on this value or metric');
  });

  it('maps each annotation type to correct semantic instruction', () => {
    const metadata = makeMetadata({
      annotations: [
        {
          annotationId: 'a1',
          semanticType: 'rectangle',
          color: 'yellow',
          boundingBox: { left: 0, top: 0, width: 100, height: 100 },
        },
        {
          annotationId: 'a2',
          semanticType: 'arrow',
          color: 'blue',
          boundingBox: { left: 0, top: 0, width: 100, height: 100 },
        },
        {
          annotationId: 'a3',
          semanticType: 'text',
          color: 'green',
          label: 'YoY growth?',
          boundingBox: { left: 0, top: 0, width: 100, height: 100 },
        },
      ],
    });
    const prompt = buildUserPrompt(metadata);
    expect(prompt).toContain('Extract and summarize this section or table');
    expect(prompt).toContain('Analyze the trend or pattern being pointed to');
    expect(prompt).toContain('User-defined context');
  });

  it('includes annotation label in prompt when present', () => {
    const metadata = makeMetadata({
      annotations: [
        {
          annotationId: 'a1',
          semanticType: 'text',
          color: 'green',
          label: 'Revenue growth?',
          boundingBox: { left: 0, top: 0, width: 100, height: 100 },
        },
      ],
    });
    expect(buildUserPrompt(metadata)).toContain('Revenue growth?');
  });
});

describe('buildFollowUpPrompt', () => {
  it('includes the question in the output', () => {
    const q = 'What drove revenue decline?';
    expect(buildFollowUpPrompt(q)).toContain(q);
  });
});
