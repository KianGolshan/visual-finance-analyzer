import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { validateFile } from '@/utils/fileValidation';
import { UPLOAD_DIR } from '@/utils/constants';
import type { DocumentMeta, UploadResponse } from '@/types/documents';

// In-memory document store (swap for Redis/Postgres in production)
export const documentStore = new Map<string, DocumentMeta>();

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
  }

  const validation = validateFile(file.type, file.size);
  if (!validation.valid) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const docId = randomUUID();
  const ext = file.name.split('.').pop() ?? 'bin';
  const uploadPath = join(process.cwd(), UPLOAD_DIR, docId);
  const filePath = join(uploadPath, `original.${ext}`);

  await mkdir(uploadPath, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const meta: DocumentMeta = {
    docId,
    originalFileName: file.name,
    uploadedAt: new Date().toISOString(),
    mimeType: file.type as DocumentMeta['mimeType'],
    pageCount: 1, // Updated after PDF parsing on client
    filePath,
    fileSize: file.size,
  };

  documentStore.set(docId, meta);

  return NextResponse.json({ success: true, docId, meta }, { status: 201 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const docId = request.nextUrl.searchParams.get('docId');
  if (!docId) {
    return NextResponse.json({ success: false, error: 'docId required' }, { status: 400 });
  }
  const meta = documentStore.get(docId);
  if (!meta) {
    return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, meta });
}
