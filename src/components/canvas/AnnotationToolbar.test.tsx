import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationToolbar } from './AnnotationToolbar';
import type { AnnotationType, AnnotationColor } from '@/types/annotations';

const defaultProps = {
  activeTool: 'circle' as AnnotationType,
  activeColor: 'red' as AnnotationColor,
  annotationCount: 0,
  onToolChange: vi.fn(),
  onColorChange: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onClear: vi.fn(),
};

describe('AnnotationToolbar', () => {
  it('renders all 5 tools', () => {
    render(<AnnotationToolbar {...defaultProps} />);
    expect(screen.getByTestId('tool-circle')).toBeDefined();
    expect(screen.getByTestId('tool-rectangle')).toBeDefined();
    expect(screen.getByTestId('tool-arrow')).toBeDefined();
    expect(screen.getByTestId('tool-text')).toBeDefined();
    expect(screen.getByTestId('tool-freehand')).toBeDefined();
  });

  it('clicking a tool calls onToolChange with that tool id', () => {
    const onToolChange = vi.fn();
    render(<AnnotationToolbar {...defaultProps} onToolChange={onToolChange} />);
    fireEvent.click(screen.getByTestId('tool-rectangle'));
    expect(onToolChange).toHaveBeenCalledWith('rectangle');
  });

  it('active tool has "active-tool" CSS class', () => {
    render(<AnnotationToolbar {...defaultProps} activeTool="arrow" />);
    const arrowBtn = screen.getByTestId('tool-arrow');
    expect(arrowBtn.className).toContain('active-tool');
  });

  it('non-active tools do not have "active-tool" class', () => {
    render(<AnnotationToolbar {...defaultProps} activeTool="circle" />);
    const rectBtn = screen.getByTestId('tool-rectangle');
    expect(rectBtn.className).not.toContain('active-tool');
  });

  it('renders all 4 color buttons', () => {
    render(<AnnotationToolbar {...defaultProps} />);
    expect(screen.getByTestId('color-red')).toBeDefined();
    expect(screen.getByTestId('color-yellow')).toBeDefined();
    expect(screen.getByTestId('color-blue')).toBeDefined();
    expect(screen.getByTestId('color-green')).toBeDefined();
  });

  it('clicking a color calls onColorChange', () => {
    const onColorChange = vi.fn();
    render(<AnnotationToolbar {...defaultProps} onColorChange={onColorChange} />);
    fireEvent.click(screen.getByTestId('color-blue'));
    expect(onColorChange).toHaveBeenCalledWith('blue');
  });

  it('displays annotation count badge', () => {
    render(<AnnotationToolbar {...defaultProps} annotationCount={3} />);
    expect(screen.getByTestId('annotation-count').textContent).toBe('3');
  });
});
