import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidDataUrl,
  extractBase64,
  extractMediaType,
  extractAnnotationsFromFabric,
  estimateBase64SizeBytes,
  resizeImageForClaude,
} from './imageProcessor';

describe('isValidDataUrl', () => {
  it('accepts valid PNG data URL', () => {
    expect(isValidDataUrl('data:image/png;base64,abc123')).toBe(true);
  });

  it('accepts valid JPEG data URL', () => {
    expect(isValidDataUrl('data:image/jpeg;base64,abc123')).toBe(true);
  });

  it('rejects plain base64 string', () => {
    expect(isValidDataUrl('abc123==')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidDataUrl('')).toBe(false);
  });
});

describe('extractBase64', () => {
  it('strips data URL prefix', () => {
    const result = extractBase64('data:image/png;base64,THEDATA');
    expect(result).toBe('THEDATA');
  });

  it('returns original string if no comma', () => {
    expect(extractBase64('rawbase64data')).toBe('rawbase64data');
  });
});

describe('extractMediaType', () => {
  it('extracts PNG media type', () => {
    expect(extractMediaType('data:image/png;base64,abc')).toBe('image/png');
  });

  it('extracts JPEG media type', () => {
    expect(extractMediaType('data:image/jpeg;base64,abc')).toBe('image/jpeg');
  });

  it('defaults to image/png for invalid input', () => {
    expect(extractMediaType('not-a-data-url')).toBe('image/png');
  });
});

describe('extractAnnotationsFromFabric', () => {
  it('returns empty array for empty input', () => {
    expect(extractAnnotationsFromFabric([])).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(extractAnnotationsFromFabric(null as unknown as never[])).toEqual([]);
  });

  it('filters out objects without annotationId', () => {
    const result = extractAnnotationsFromFabric([{ type: 'rect', left: 10 }]);
    expect(result).toHaveLength(0);
  });

  it('correctly extracts annotation with annotationId', () => {
    const fabricObj = {
      annotationId: 'test-id',
      semanticType: 'circle',
      annotationColor: 'red',
      label: 'Revenue',
      left: 10,
      top: 20,
      width: 50,
      height: 50,
      scaleX: 1,
      scaleY: 1,
    };
    const result = extractAnnotationsFromFabric([fabricObj]);
    expect(result).toHaveLength(1);
    expect(result[0].annotationId).toBe('test-id');
    expect(result[0].semanticType).toBe('circle');
    expect(result[0].color).toBe('red');
    expect(result[0].label).toBe('Revenue');
    expect(result[0].boundingBox.left).toBe(10);
  });

  it('handles scaleX/scaleY for bounding box width/height', () => {
    const fabricObj = {
      annotationId: 'a1',
      left: 0,
      top: 0,
      width: 100,
      height: 50,
      scaleX: 2,
      scaleY: 3,
    };
    const result = extractAnnotationsFromFabric([fabricObj]);
    expect(result[0].boundingBox.width).toBe(200);
    expect(result[0].boundingBox.height).toBe(150);
  });
});

describe('estimateBase64SizeBytes', () => {
  it('estimates size for a known base64 string', () => {
    // 8 chars of base64 ≈ 6 bytes
    expect(estimateBase64SizeBytes('AAAAAAAA')).toBeCloseTo(6, 0);
  });
});

describe('resizeImageForClaude', () => {
  beforeEach(() => {
    // Mock Image constructor
    vi.stubGlobal(
      'Image',
      class MockImage {
        width = 0;
        height = 0;
        src = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(value: string) {
          this._src = value;
          // Simulate async image load
          setTimeout(() => {
            this.width = 800;
            this.height = 600;
            this.onload?.();
          }, 0);
        }
        get src() {
          return this._src ?? '';
        }
        private _src?: string;
      }
    );

    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: vi.fn() }),
            toDataURL: () => 'data:image/jpeg;base64,resized',
          };
        }
        return {};
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns original dataUrl if image width is within limit', async () => {
    vi.stubGlobal(
      'Image',
      class SmallImage {
        width = 400;
        height = 300;
        src = '';
        onload: (() => void) | null = null;
        set src(_v: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      }
    );
    const input = 'data:image/png;base64,smallimage';
    const result = await resizeImageForClaude(input);
    expect(result).toBe(input);
  });

  it('resizes image if width exceeds MAX_IMAGE_WIDTH_PX', async () => {
    vi.stubGlobal(
      'Image',
      class LargeImage {
        width = 3000;
        height = 2000;
        onload: (() => void) | null = null;
        set src(_v: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      }
    );

    const result = await resizeImageForClaude('data:image/png;base64,largeimage');
    // Should return the resized canvas output
    expect(result).toBe('data:image/jpeg;base64,resized');
  });

  it('returns original dataUrl when called server-side (no window)', async () => {
    vi.stubGlobal('window', undefined);
    const input = 'data:image/png;base64,serverside';
    const result = await resizeImageForClaude(input);
    expect(result).toBe(input);
  });
});
