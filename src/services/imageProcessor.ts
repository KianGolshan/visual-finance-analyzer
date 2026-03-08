import type { AnnotationObject } from '@/types/annotations';
import { MAX_IMAGE_WIDTH_PX } from '@/utils/constants';

/**
 * Validates that a string is a proper base64 data URL.
 */
export function isValidDataUrl(dataUrl: string): boolean {
  return /^data:image\/(png|jpeg|webp|gif);base64,/.test(dataUrl);
}

/**
 * Strips the data URL prefix and returns the raw base64 string.
 */
export function extractBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return dataUrl;
  return dataUrl.slice(comma + 1);
}

/**
 * Extracts the media type from a data URL.
 */
export function extractMediaType(
  dataUrl: string
): 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,/);
  if (!match) return 'image/png';
  return match[1] as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}

/**
 * Serializes Fabric.js canvas objects into AnnotationObject metadata.
 * Called client-side after the user draws annotations.
 */
export function extractAnnotationsFromFabric(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fabricObjects: any[]
): AnnotationObject[] {
  if (!Array.isArray(fabricObjects)) return [];

  return fabricObjects
    .filter((obj) => obj?.annotationId)
    .map((obj) => ({
      annotationId: obj.annotationId as string,
      semanticType: obj.semanticType ?? 'rectangle',
      color: obj.annotationColor ?? 'red',
      label: obj.label ?? undefined,
      boundingBox: {
        left: obj.left ?? 0,
        top: obj.top ?? 0,
        width: (obj.width ?? 0) * (obj.scaleX ?? 1),
        height: (obj.height ?? 0) * (obj.scaleY ?? 1),
      },
      fabricData: obj,
    }));
}

/**
 * Resizes a base64 image to a max width, returning a new data URL.
 * Uses Canvas API — must be called in a browser context.
 */
export async function resizeImageForClaude(dataUrl: string): Promise<string> {
  if (typeof window === 'undefined') return dataUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= MAX_IMAGE_WIDTH_PX) {
        resolve(dataUrl);
        return;
      }
      const ratio = MAX_IMAGE_WIDTH_PX / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = MAX_IMAGE_WIDTH_PX;
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = dataUrl;
  });
}

/**
 * Computes approximate base64 size in bytes.
 */
export function estimateBase64SizeBytes(base64: string): number {
  return Math.round((base64.length * 3) / 4);
}
