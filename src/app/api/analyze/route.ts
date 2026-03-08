import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument, analyzeWithHistory } from '@/services/claude';
import type { AnalyzeRequest, AnalyzeResponse } from '@/types/analysis';

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const body = (await request.json()) as Partial<AnalyzeRequest> & { followUpQuestion?: string };

  if (!body.imageBase64) {
    return NextResponse.json(
      { success: false, error: 'imageBase64 is required.' },
      { status: 400 }
    );
  }

  if (!body.annotationMetadata) {
    return NextResponse.json(
      { success: false, error: 'annotationMetadata is required.' },
      { status: 400 }
    );
  }

  // Follow-up chat turn
  if (body.followUpQuestion && body.conversationHistory) {
    const result = await analyzeWithHistory(
      body.imageBase64,
      body.conversationHistory,
      body.followUpQuestion
    );
    return NextResponse.json(result);
  }

  // Initial analysis
  const result = await analyzeDocument(body.imageBase64, body.annotationMetadata);
  return NextResponse.json(result);
}
