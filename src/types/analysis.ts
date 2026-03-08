export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AnnotationInsight {
  annotation_id: string;
  annotation_type: string;
  region_description: string;
  extracted_value_or_trend: string;
  financial_insight: string;
  confidence: ConfidenceLevel;
}

export interface InsightResponse {
  annotations_processed: number;
  insights: AnnotationInsight[];
  overall_summary: string;
  flagged_risks: string[];
  follow_up_questions: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalyzeRequest {
  imageBase64: string;
  annotationMetadata: import('./annotations').AnnotationMetadata;
  conversationHistory?: ChatMessage[];
}

export interface AnalyzeResponse {
  success: boolean;
  data?: InsightResponse;
  rawText?: string;
  error?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
