import { MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from './constants';
import type { SupportedMimeType } from '@/types/documents';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileType(mimeType: string): ValidationResult {
  if (SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType)) {
    return { valid: true };
  }
  return {
    valid: false,
    error: `Unsupported file type: ${mimeType}. Accepted types: PDF, PNG, JPG, WEBP.`,
  };
}

export function validateFileSize(sizeBytes: number): ValidationResult {
  if (sizeBytes === 0) {
    return { valid: false, error: 'File is empty.' };
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `File size ${sizeMB}MB exceeds the ${maxMB}MB limit.`,
    };
  }
  return { valid: true };
}

export function validateFile(mimeType: string, sizeBytes: number): ValidationResult {
  const typeResult = validateFileType(mimeType);
  if (!typeResult.valid) return typeResult;
  return validateFileSize(sizeBytes);
}
