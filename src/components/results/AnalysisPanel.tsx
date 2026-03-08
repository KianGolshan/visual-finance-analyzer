'use client';

import { useState, useCallback } from 'react';
import type { AnnotationInsight, ConfidenceLevel, InsightResponse } from '@/types/analysis';

interface AnalysisPanelProps {
  data: InsightResponse;
  rawText: string;
  onFollowUpQuestion: (question: string) => void;
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: 'bg-green-900/40 text-green-300 border border-green-700',
  medium: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  low: 'bg-red-900/40 text-red-300 border border-red-700',
};

function InsightCard({ insight }: { insight: AnnotationInsight }) {
  return (
    <div
      data-testid={`insight-card-${insight.annotation_id}`}
      className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">#{insight.annotation_id}</span>
          <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-300 capitalize">
            {insight.annotation_type}
          </span>
        </div>
        <span
          data-testid={`confidence-${insight.annotation_id}`}
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[insight.confidence]}`}
        >
          {insight.confidence}
        </span>
      </div>
      <p className="text-sm text-gray-400">{insight.region_description}</p>
      <p className="text-sm font-medium text-white">{insight.extracted_value_or_trend}</p>
      <p className="text-sm text-blue-300">{insight.financial_insight}</p>
    </div>
  );
}

export function AnalysisPanel({ data, rawText, onFollowUpQuestion }: AnalysisPanelProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    window.print();
  };

  const handleCopyJson = useCallback(() => {
    navigator.clipboard.writeText(rawText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [rawText]);

  return (
    <div data-testid="analysis-panel" className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Analysis Results</h2>
        <div className="flex gap-2">
          <button
            data-testid="export-pdf-button"
            onClick={handleExport}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            Print / Save as PDF
          </button>
          <button
            data-testid="copy-json-button"
            onClick={handleCopyJson}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            {showRaw ? 'Hide Raw' : 'Raw'}
          </button>
        </div>
      </div>

      {/* Raw JSON view */}
      {showRaw && (
        <pre className="text-xs text-green-300 bg-gray-950 rounded-xl p-4 overflow-auto max-h-48 font-mono">
          {rawText}
        </pre>
      )}

      {/* Overall summary */}
      <div
        data-testid="overall-summary"
        className="bg-blue-950/40 border border-blue-800 rounded-xl p-4"
      >
        <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
          Overall Summary
        </h3>
        <p className="text-sm text-gray-200">{data.overall_summary}</p>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Annotation Insights ({data.annotations_processed})
        </h3>
        {data.insights.map((insight) => (
          <InsightCard key={insight.annotation_id} insight={insight} />
        ))}
      </div>

      {/* Flagged risks */}
      {data.flagged_risks.length > 0 && (
        <div
          data-testid="flagged-risks"
          className="bg-red-950/40 border border-red-800 rounded-xl p-4"
        >
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
            Flagged Risks
          </h3>
          <ul className="space-y-1.5">
            {data.flagged_risks.map((risk, i) => (
              <li key={i} className="text-sm text-red-200 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">!</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up questions */}
      {data.follow_up_questions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Follow-up Questions
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.follow_up_questions.map((q, i) => (
              <button
                key={i}
                data-testid={`follow-up-question-${i}`}
                onClick={() => onFollowUpQuestion(q)}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-300 border border-gray-600 rounded-full transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
