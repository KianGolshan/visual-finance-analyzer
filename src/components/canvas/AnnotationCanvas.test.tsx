import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createRef } from 'react';
import { AnnotationCanvas, type AnnotationCanvasHandle } from './AnnotationCanvas';

// Mock Fabric.js to avoid canvas/DOM issues in jsdom
vi.mock('fabric', () => {
  const mockCanvas = {
    on: vi.fn(),
    off: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    renderAll: vi.fn(),
    toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
    getObjects: vi.fn(() => []),
    dispose: vi.fn(),
    setDimensions: vi.fn(),
    setActiveObject: vi.fn(),
    isDrawingMode: false,
    selection: false,
    freeDrawingBrush: null,
    backgroundImage: null,
    lowerCanvasEl: null,
    width: 800,
    height: 600,
    _objects: [] as any[],
  };

  // Must use regular function (not arrow) so `new Canvas()` works as a constructor
  return {
    Canvas: vi.fn(function () { return mockCanvas; }),
    Ellipse: vi.fn(() => ({ set: vi.fn(), annotationId: '', semanticType: '', annotationColor: '' })),
    Rect: vi.fn(() => ({ set: vi.fn(), annotationId: '', semanticType: '', annotationColor: '' })),
    Line: vi.fn(() => ({})),
    Triangle: vi.fn(() => ({})),
    Group: vi.fn(() => ({ annotationId: '', semanticType: '', annotationColor: '' })),
    FabricText: vi.fn(() => ({ annotationId: '', semanticType: '', annotationColor: '' })),
    IText: vi.fn(() => ({
      annotationId: '',
      semanticType: '',
      annotationColor: '',
      enterEditing: vi.fn(),
      on: vi.fn(),
    })),
    PencilBrush: vi.fn(() => ({ color: '', width: 0 })),
    FabricImage: {
      fromURL: vi.fn().mockResolvedValue({
        width: 800,
        height: 600,
        set: vi.fn(),
        scale: vi.fn(),
      }),
    },
  };
});

const defaultProps = {
  documentImageUrl: 'data:image/png;base64,testimage',
  activeTool: 'rectangle' as const,
  activeColor: 'red' as const,
  onAnnotationCountChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnnotationCanvas', () => {
  it('renders canvas container with correct test id', () => {
    render(<AnnotationCanvas {...defaultProps} />);
    expect(screen.getByTestId('annotation-canvas-container')).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<AnnotationCanvas {...defaultProps} />);
    expect(screen.getByText(/loading document/i)).toBeDefined();
  });

  it('renders a canvas element inside the container', () => {
    render(<AnnotationCanvas {...defaultProps} />);
    const container = screen.getByTestId('annotation-canvas-container');
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('exposes getImageDataUrl via ref', async () => {
    const ref = createRef<AnnotationCanvasHandle>();
    render(<AnnotationCanvas ref={ref} {...defaultProps} />);
    // Wait for dynamic import to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(typeof ref.current?.getImageDataUrl).toBe('function');
  });

  it('exposes getAnnotations via ref', async () => {
    const ref = createRef<AnnotationCanvasHandle>();
    render(<AnnotationCanvas ref={ref} {...defaultProps} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(typeof ref.current?.getAnnotations).toBe('function');
  });

  it('exposes undo, redo, clear via ref', async () => {
    const ref = createRef<AnnotationCanvasHandle>();
    render(<AnnotationCanvas ref={ref} {...defaultProps} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(typeof ref.current?.undo).toBe('function');
    expect(typeof ref.current?.redo).toBe('function');
    expect(typeof ref.current?.clear).toBe('function');
  });

  it('does not throw when undo/redo called before canvas initializes', async () => {
    const ref = createRef<AnnotationCanvasHandle>();
    render(<AnnotationCanvas ref={ref} {...defaultProps} />);
    // Immediately call before async setup completes
    expect(() => ref.current?.undo()).not.toThrow();
    expect(() => ref.current?.redo()).not.toThrow();
    expect(() => ref.current?.clear()).not.toThrow();
  });
});
