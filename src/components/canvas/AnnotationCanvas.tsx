'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { AnnotationColor, AnnotationObject, AnnotationType } from '@/types/annotations';

const COLOR_MAP: Record<AnnotationColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
};

export interface AnnotationCanvasHandle {
  getImageDataUrl: () => string;
  getAnnotations: () => AnnotationObject[];
  getCanvasDimensions: () => { width: number; height: number };
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

interface AnnotationCanvasProps {
  documentImageUrl: string;
  activeTool: AnnotationType;
  activeColor: AnnotationColor;
  onAnnotationCountChange: (count: number) => void;
}

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function loadImageDims(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  ({ documentImageUrl, activeTool, activeColor, onAnnotationCountChange }, ref) => {
    // containerRef wraps ONLY the canvas — React never adds/removes children here.
    // This prevents React's reconciler from moving the canvas out of Fabric's wrapper.
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<{ canvas: any; mod: any } | null>(null);

    const activeToolRef = useRef(activeTool);
    const activeColorRef = useRef(activeColor);
    const isDrawingRef = useRef(false);
    const startPointerRef = useRef({ x: 0, y: 0 });
    const drawingObjectRef = useRef<any>(null);
    const removedObjectsRef = useRef<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
    useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);

    const updateCount = useCallback(() => {
      if (!fabricRef.current) return;
      const count = fabricRef.current.canvas
        .getObjects()
        .filter((o: any) => o.annotationId).length;
      onAnnotationCountChange(count);
    }, [onAnnotationCountChange]);

    useImperativeHandle(ref, () => ({
      getImageDataUrl: () => {
        if (!fabricRef.current) return '';
        return fabricRef.current.canvas.toDataURL({ format: 'png', quality: 1 });
      },
      getAnnotations: (): AnnotationObject[] => {
        if (!fabricRef.current) return [];
        return fabricRef.current.canvas
          .getObjects()
          .filter((o: any) => o.annotationId)
          .map((o: any) => {
            const bounds = o.getBoundingRect();
            return {
              annotationId: o.annotationId as string,
              semanticType: (o.semanticType ?? 'rectangle') as AnnotationType,
              color: (o.annotationColor ?? 'red') as AnnotationColor,
              label: o.label,
              boundingBox: {
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
                height: bounds.height,
              },
            };
          });
      },
      getCanvasDimensions: () => {
        if (!fabricRef.current) return { width: 0, height: 0 };
        const { canvas } = fabricRef.current;
        return { width: canvas.width ?? 0, height: canvas.height ?? 0 };
      },
      undo: () => {
        if (!fabricRef.current) return;
        const objs = fabricRef.current.canvas.getObjects().filter((o: any) => o.annotationId);
        if (!objs.length) return;
        const last = objs[objs.length - 1];
        fabricRef.current.canvas.remove(last);
        removedObjectsRef.current.push(last);
        if (removedObjectsRef.current.length > 50) removedObjectsRef.current.shift();
        fabricRef.current.canvas.renderAll();
        updateCount();
      },
      redo: () => {
        if (!fabricRef.current) return;
        const obj = removedObjectsRef.current.pop();
        if (!obj) return;
        fabricRef.current.canvas.add(obj);
        fabricRef.current.canvas.renderAll();
        updateCount();
      },

      clear: () => {
        if (!fabricRef.current) return;
        fabricRef.current.canvas
          .getObjects()
          .filter((o: any) => o.annotationId)
          .forEach((o: any) => fabricRef.current!.canvas.remove(o));
        removedObjectsRef.current = [];
        fabricRef.current.canvas.renderAll();
        updateCount();
      },
    }), [updateCount]);

    useEffect(() => {
      if (!documentImageUrl || !canvasRef.current || !containerRef.current) return;

      setIsLoading(true);
      let mounted = true;
      let fabricCanvas: any = null;

      const setup = async () => {
        const { w: imgW, h: imgH } = await loadImageDims(documentImageUrl);
        if (!mounted || !canvasRef.current || !containerRef.current) return;

        const containerW = containerRef.current.offsetWidth || 900;
        const scale = Math.min(containerW / imgW, 1);
        const canvasW = Math.round(imgW * scale);
        const canvasH = Math.round(imgH * scale);

        const fabric = await import('fabric');
        if (!mounted || !canvasRef.current) return;

        // Create Fabric canvas with correct dimensions from the start.
        // Never call setDimensions() after init — it resizes the internal canvas
        // but not the wrapper div, leaving the document in the top-left of a
        // larger dark area.
        fabricCanvas = new fabric.Canvas(canvasRef.current, {
          selection: false,
          width: canvasW,
          height: canvasH,
          backgroundColor: '#111827',
        });
        fabricRef.current = { canvas: fabricCanvas, mod: fabric };

        const bgImg = await fabric.FabricImage.fromURL(documentImageUrl);
        if (!mounted) return;
        bgImg.set({ scaleX: scale, scaleY: scale, left: 0, top: 0, originX: 'left', originY: 'top' });
        fabricCanvas.backgroundImage = bgImg;
        fabricCanvas.renderAll();

        // IMPORTANT: setIsLoading(false) triggers a React re-render. To prevent
        // React's reconciler from moving the canvas DOM node (which would yank it
        // out of Fabric's wrapper div), the loading overlay must NEVER be
        // conditionally rendered as a sibling of the canvas. We use CSS display
        // toggling instead (see JSX below).
        setIsLoading(false);

        // ── Event handlers ────────────────────────────────────────────────────

        fabricCanvas.on('mouse:down', (opt: any) => {
          const tool = activeToolRef.current;
          const color = COLOR_MAP[activeColorRef.current];
          const pointer = opt.pointer ?? { x: 0, y: 0 };

          if (tool === 'freehand') return;

          if (tool === 'text') {
            const textObj = new fabric.IText('Type here...', {
              left: pointer.x,
              top: pointer.y,
              fontSize: 16,
              fill: color,
              editable: true,
              selectable: true,
            } as any);
            (textObj as any).annotationId = generateId();
            (textObj as any).semanticType = 'text';
            (textObj as any).annotationColor = activeColorRef.current;
            fabricCanvas.add(textObj);
            fabricCanvas.setActiveObject(textObj);
            (textObj as any).enterEditing?.();
            fabricCanvas.renderAll();
            removedObjectsRef.current = [];
            updateCount();
            return;
          }

          if (tool === 'arrow') {
            isDrawingRef.current = true;
            startPointerRef.current = { x: pointer.x, y: pointer.y };
            return;
          }

          isDrawingRef.current = true;
          startPointerRef.current = { x: pointer.x, y: pointer.y };

          const obj: any = tool === 'circle'
            ? new fabric.Ellipse({
                left: pointer.x, top: pointer.y,
                rx: 0, ry: 0,
                stroke: color, strokeWidth: 3,
                fill: 'transparent', selectable: false, evented: false,
              })
            : new fabric.Rect({
                left: pointer.x, top: pointer.y,
                width: 0, height: 0,
                stroke: color, strokeWidth: 3,
                fill: 'transparent', selectable: false, evented: false,
              });

          obj.annotationId = generateId();
          obj.semanticType = tool;
          obj.annotationColor = activeColorRef.current;
          fabricCanvas.add(obj);
          drawingObjectRef.current = obj;
        });

        fabricCanvas.on('mouse:move', (opt: any) => {
          if (!isDrawingRef.current || !drawingObjectRef.current) return;
          const tool = activeToolRef.current;
          const pointer = opt.pointer ?? { x: 0, y: 0 };
          const { x: sx, y: sy } = startPointerRef.current;
          const obj = drawingObjectRef.current;

          if (tool === 'circle') {
            obj.set({
              left: Math.min(pointer.x, sx), top: Math.min(pointer.y, sy),
              rx: Math.abs(pointer.x - sx) / 2, ry: Math.abs(pointer.y - sy) / 2,
            });
          } else if (tool === 'rectangle') {
            obj.set({
              left: Math.min(pointer.x, sx), top: Math.min(pointer.y, sy),
              width: Math.abs(pointer.x - sx), height: Math.abs(pointer.y - sy),
            });
          }
          fabricCanvas.renderAll();
        });

        fabricCanvas.on('mouse:up', (opt: any) => {
          const tool = activeToolRef.current;
          const color = COLOR_MAP[activeColorRef.current];
          const pointer = opt.pointer ?? { x: 0, y: 0 };
          const { x: sx, y: sy } = startPointerRef.current;

          if (!isDrawingRef.current) return;
          isDrawingRef.current = false;

          if (tool === 'arrow') {
            const dx = pointer.x - sx;
            const dy = pointer.y - sy;
            if (Math.sqrt(dx * dx + dy * dy) < 5) return;

            const line = new fabric.Line([sx, sy, pointer.x, pointer.y], {
              stroke: color, strokeWidth: 3, selectable: false, evented: false,
            });
            const arrowHead = new fabric.Triangle({
              left: pointer.x, top: pointer.y,
              angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
              width: 14, height: 14, fill: color,
              selectable: false, evented: false,
              originX: 'center', originY: 'center',
            } as any);
            const group = new fabric.Group([line, arrowHead], {
              selectable: true, evented: true,
            } as any);
            (group as any).annotationId = generateId();
            (group as any).semanticType = 'arrow';
            (group as any).annotationColor = activeColorRef.current;
            fabricCanvas.add(group);
            fabricCanvas.renderAll();
            removedObjectsRef.current = [];
            updateCount();
            return;
          }

          if (drawingObjectRef.current) {
            drawingObjectRef.current.set({ selectable: true, evented: true });
            fabricCanvas.renderAll();
            drawingObjectRef.current = null;
            removedObjectsRef.current = [];
            updateCount();
          }
        });

        fabricCanvas.on('path:created', (opt: any) => {
          if (opt.path) {
            opt.path.annotationId = generateId();
            opt.path.semanticType = 'freehand';
            opt.path.annotationColor = activeColorRef.current;
            removedObjectsRef.current = [];
            updateCount();
          }
        });
      };

      setup().catch(console.error);

      return () => {
        mounted = false;
        // Fabric v7 dispose() restores the original canvas element back to its
        // parent in the DOM (via replaceChild), so canvasRef stays valid for
        // the next setup run (e.g. page navigation).
        fabricCanvas?.dispose();
        fabricRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentImageUrl]);

    useEffect(() => {
      if (!fabricRef.current) return;
      const { canvas, mod } = fabricRef.current;
      const color = COLOR_MAP[activeColor];

      if (activeTool === 'freehand') {
        canvas.isDrawingMode = true;
        const brush = new mod.PencilBrush(canvas);
        brush.color = color;
        brush.width = 3;
        canvas.freeDrawingBrush = brush;
      } else {
        canvas.isDrawingMode = false;
        canvas.selection = false;
      }
    }, [activeTool, activeColor]);

    return (
      // Outer wrapper: holds the loading overlay AND the canvas container as
      // permanent VDOM siblings. Using CSS display (not conditional rendering)
      // for the overlay ensures React never changes the child count of
      // containerRef, so Fabric's internal wrapper div is never disturbed.
      <div data-testid="annotation-canvas-container" className="relative w-full">

        {/* Loading overlay — always in VDOM, toggled via display */}
        <div
          className="absolute inset-0 min-h-64 flex items-center justify-center bg-gray-950 z-10 rounded-xl"
          style={{ display: isLoading ? 'flex' : 'none' }}
        >
          <div className="text-gray-400 text-sm animate-pulse">Loading document...</div>
        </div>

        {/* Canvas container — sole child is the canvas; React must never
            insert/remove siblings here or it will move the canvas out of
            Fabric's wrapper and break all drawing. */}
        <div ref={containerRef} className="w-full">
          <canvas ref={canvasRef} className="block" />
        </div>

      </div>
    );
  }
);

AnnotationCanvas.displayName = 'AnnotationCanvas';
