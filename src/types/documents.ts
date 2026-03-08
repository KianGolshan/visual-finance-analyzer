export type SupportedMimeType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp';

export interface DocumentMeta {
  docId: string;
  originalFileName: string;
  uploadedAt: string;
  mimeType: SupportedMimeType;
  pageCount: number;
  filePath: string;
  fileSize: number;
}

export interface UploadResponse {
  success: boolean;
  docId?: string;
  meta?: DocumentMeta;
  error?: string;
}
