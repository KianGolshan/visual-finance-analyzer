import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisPanel } from './AnalysisPanel';
import type { InsightResponse } from '@/types/analysis';

const sampleData: InsightResponse = {
  annotations_processed: 2,
  insights: [
    {
      annotation_id: 'a1',
      annotation_type: 'circle',
      region_description: 'Revenue figure for FY2023',
      extracted_value_or_trend: '$383.3B',
      financial_insight: 'Net sales declined 2.8% YoY.',
      confidence: 'high',
    },
    {
      annotation_id: 'a2',
      annotation_type: 'rectangle',
      region_description: 'Net sales row',
      extracted_value_or_trend: '$365.8B, $394.3B, $383.3B',
      financial_insight: 'Revenue peaked in FY2022.',
      confidence: 'medium',
    },
  ],
  overall_summary: 'Apple revenue showed mixed trends across the analyzed period.',
  flagged_risks: ['Revenue declined in FY2023', 'Services dependency growing'],
  follow_up_questions: ['What drove the decline?', 'How does this compare to peers?'],
};

const rawText = JSON.stringify(sampleData);

describe('AnalysisPanel', () => {
  it('renders the analysis panel', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.getByTestId('analysis-panel')).toBeDefined();
  });

  it('displays the overall summary', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.getByTestId('overall-summary')).toBeDefined();
    expect(screen.getByText(/Apple revenue showed mixed trends/i)).toBeDefined();
  });

  it('renders an insight card for each annotation', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.getByTestId('insight-card-a1')).toBeDefined();
    expect(screen.getByTestId('insight-card-a2')).toBeDefined();
  });

  it('displays confidence badges with correct text', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    const highBadge = screen.getByTestId('confidence-a1');
    expect(highBadge.textContent).toBe('high');
    const mediumBadge = screen.getByTestId('confidence-a2');
    expect(mediumBadge.textContent).toBe('medium');
  });

  it('renders flagged risks', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.getByTestId('flagged-risks')).toBeDefined();
    expect(screen.getByText(/Revenue declined in FY2023/i)).toBeDefined();
  });

  it('renders follow-up question chips', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.getByTestId('follow-up-question-0')).toBeDefined();
    expect(screen.getByTestId('follow-up-question-1')).toBeDefined();
  });

  it('calls onFollowUpQuestion when a question chip is clicked', () => {
    const onFollowUp = vi.fn();
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={onFollowUp} />);
    fireEvent.click(screen.getByTestId('follow-up-question-0'));
    expect(onFollowUp).toHaveBeenCalledWith('What drove the decline?');
  });

  it('shows Export as PDF button', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.getByTestId('export-pdf-button')).toBeDefined();
  });

  it('shows Copy JSON button', () => {
    render(<AnalysisPanel data={sampleData} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.getByTestId('copy-json-button')).toBeDefined();
  });

  it('does not show flagged risks section when list is empty', () => {
    const dataNoRisks = { ...sampleData, flagged_risks: [] };
    render(<AnalysisPanel data={dataNoRisks} rawText={rawText} onFollowUpQuestion={vi.fn()} />);
    expect(screen.queryByTestId('flagged-risks')).toBeNull();
  });
});
