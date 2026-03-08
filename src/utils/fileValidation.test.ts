import { describe, it, expect } from 'vitest';
import { validateFileType, validateFileSize, validateFile } from './fileValidation';

describe('validateFileType', () => {
  it('accepts PDF', () => {
    expect(validateFileType('application/pdf').valid).toBe(true);
  });

  it('accepts PNG', () => {
    expect(validateFileType('image/png').valid).toBe(true);
  });

  it('accepts JPEG', () => {
    expect(validateFileType('image/jpeg').valid).toBe(true);
  });

  it('accepts WEBP', () => {
    expect(validateFileType('image/webp').valid).toBe(true);
  });

  it('rejects EXE', () => {
    const result = validateFileType('application/x-msdownload');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unsupported file type/i);
  });

  it('rejects ZIP', () => {
    const result = validateFileType('application/zip');
    expect(result.valid).toBe(false);
  });

  it('rejects DOCX', () => {
    const result = validateFileType(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(result.valid).toBe(false);
  });
});

describe('validateFileSize', () => {
  it('accepts file within size limit', () => {
    expect(validateFileSize(1024 * 1024).valid).toBe(true); // 1MB
  });

  it('rejects empty file', () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });

  it('rejects file over 20MB', () => {
    const result = validateFileSize(21 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/exceeds/i);
  });

  it('accepts exactly 20MB', () => {
    expect(validateFileSize(20 * 1024 * 1024).valid).toBe(true);
  });
});

describe('validateFile', () => {
  it('valid file passes both checks', () => {
    expect(validateFile('image/png', 1024 * 1024).valid).toBe(true);
  });

  it('invalid type fails even with valid size', () => {
    expect(validateFile('application/zip', 100).valid).toBe(false);
  });

  it('invalid size fails even with valid type', () => {
    expect(validateFile('image/png', 0).valid).toBe(false);
  });
});
