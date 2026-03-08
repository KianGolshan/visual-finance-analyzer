export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 20);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './tmp/uploads';

export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
export const CLAUDE_MAX_TOKENS_ANALYSIS = 2048;
export const CLAUDE_MAX_TOKENS_FOLLOWUP = 1024;

// Max image width before base64 encoding for Claude vision
export const MAX_IMAGE_WIDTH_PX = 1568;

export const ANNOTATION_COLOR_MAP = {
  red: 'RED CIRCLE/SHAPE',
  yellow: 'YELLOW RECTANGLE/SHAPE',
  blue: 'BLUE ARROW/SHAPE',
  green: 'GREEN TEXT LABEL',
} as const;

export const ANNOTATION_SEMANTIC_MAP = {
  red: 'Focus specifically on this value or metric',
  yellow: 'Extract and summarize this section or table',
  blue: 'Analyze the trend or pattern being pointed to',
  green: 'User-defined context — treat label as a question or instruction',
} as const;
