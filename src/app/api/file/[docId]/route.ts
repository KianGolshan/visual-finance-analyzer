import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { documentStore } from '@/app/api/upload/route';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
): Promise<NextResponse> {
  const { docId } = await params;

  const meta = documentStore.get(docId);
  if (!meta) {
    return new NextResponse('Document not found', { status: 404 });
  }

  try {
    const data = await readFile(meta.filePath);
    return new NextResponse(data, {
      headers: {
        'Content-Type': meta.mimeType,
        'Content-Disposition': `inline; filename="${meta.originalFileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('File not found on disk', { status: 404 });
  }
}
