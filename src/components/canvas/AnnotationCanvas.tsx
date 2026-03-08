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
  return Math.random().toString(36).slice(2, 10);
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  ({ documentImageUrl, activeTool, activeColor, onAnnotationCountChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<{
      canvas: any;
      mod: any;
    } | null>(null);

    const activeToolRef = useRef(activeTool);
    const activeColorRef = useRef(activeColor);
    const isDrawingRef = useRef(false);
    const startPointerRef = useRef({ x: 0, y: 0 });
    const drawingObjectRef = useRef<any>(null);
    const removedObjectsRef = useRef<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    // Keep refs in sync with props
    useEffect(() => {
      activeToolRef.current = activeTool;
    }, [activeTool]);

    useEffect(() => {
      activeColorRef.current = activeColor;
    }, [activeColor]);

    const updateCount = useCallback(() => {
      if (!fabricRef.current) return;
      const count = fabricRef.current.canvas
        .getObjects()
        .filter((o: any) => o.annotationId).length;
      onAnnotationCountChange(count);
    }, [onAnnotationCountChange]);

    // Exposed handle
    useImperativeHandle(
      ref,
      () => ({
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
                fabricData: o.toObject(['annotationId', 'semanticType', 'annotationColor', 'label']),
              };
            });
        },
        undo: () => {
          if (!fabricRef.current) return;
          const objects = fabricRef.current.canvas
            .getObjects()
            .filter((o: any) => o.annotationId);
          if (objects.length === 0) return;
          const last = objects[objects.length - 1];
          fabricRef.current.canvas.remove(last);
          removedObjectsRef.current.push(last);
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
          const toRemove = fabricRef.current.canvas
            .getObjects()
            .filter((o: any) => o.annotationId);
          toRemove.forEach((o: any) => fabricRef.current!.canvas.remove(o));
          removedObjectsRef.current = [];
          fabricRef.current.canvas.renderAll();
          updateCount();
        },
      }),
      [updateCount]
    );

    useEffect(() => {
      if (!canvasRef.current || !containerRef.current || !documentImageUrl) return;

      let mounted = true;
      let fabricCanvas: any = null;

      const setup = async () => {
        const fabric = await import('fabric');
        if (!mounted || !canvasRef.current) return;

        const containerW = containerRef.current?.offsetWidth || 900;
        const containerH = containerRef.current?.offsetHeight || 650;

        fabricCanvas = new fabric.Canvas(canvasRef.current, {
          selection: false,
          width: containerW,
          height: containerH,
          backgroundColor: '#1a1a1a',
        });

        fabricRef.current = { canvas: fabricCanvas, mod: fabric };

        // Load background document image
        try {
          const img = await fabric.FabricImage.fromURL(documentImageUrl);
          if (!mounted) return;

          const scaleX = containerW / (img.width || containerW);
          const scaleY = containerH / (img.height || containerH);
          const scale = Math.min(scaleX, scaleY, 1);
          const scaledW = Math.round((img.width || containerW) * scale);
          const scaledH = Math.round((img.height || containerH) * scale);

          fabricCanvas.setDimensions({ width: scaledW, height: scaledH });
          img.set({ scaleX: scale, scaleY: scale });
          fabricCanvas.backgroundImage = img;
          fabricCanvas.renderAll();
        } catch {
          // Image failed to load — keep blank canvas
        }

        setIsLoading(false);

        // ── Mouse event handlers ──────────────────────────────────────────────

        fabricCanvas.on('mouse:down', (opt: any) => {
          const tool = activeToolRef.current;
          const color = COLOR_MAP[activeColorRef.current];
          const pointer = opt.pointer ?? { x: 0, y: 0 };

          // Freehand mode is handled by Fabric automatically
          if (tool === 'freehand') return;
          // Text: place on click without drag
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

          // Arrow: defer creation to mouse:up
          if (tool === 'arrow') {
            isDrawingRef.current = true;
            startPointerRef.current = { x: pointer.x, y: pointer.y };
            return;
          }

          // Circle or Rectangle: start drawing
          isDrawingRef.current = true;
          startPointerRef.current = { x: pointer.x, y: pointer.y };

          let obj: any;
          if (tool === 'circle') {
            obj = new fabric.Ellipse({
              left: pointer.x,
              top: pointer.y,
              rx: 0,
              ry: 0,
              stroke: color,
              strokeWidth: 2,
              fill: 'transparent',
              selectable: false,
              evented: false,
            });
          } else {
            obj = new fabric.Rect({
              left: pointer.x,
              top: pointer.y,
              width: 0,
              height: 0,
              stroke: color,
              strokeWidth: 2,
              fill: 'transparent',
              selectable: false,
              evented: false,
            });
          }

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
          const start = startPointerRef.current;
          const obj = drawingObjectRef.current;

          if (tool === 'circle') {
            const rx = Math.abs(pointer.x - start.x) / 2;
            const ry = Math.abs(pointer.y - start.y) / 2;
            obj.set({
              left: Math.min(pointer.x, start.x),
              top: Math.min(pointer.y, start.y),
              rx,
              ry,
            });
          } else if (tool === 'rectangle') {
            obj.set({
              left: Math.min(pointer.x, start.x),
              top: Math.min(pointer.y, start.y),
              width: Math.abs(pointer.x - start.x),
              height: Math.abs(pointer.y - start.y),
            });
          }
          fabricCanvas.renderAll();
        });

        fabricCanvas.on('mouse:up', (opt: any) => {
          const tool = activeToolRef.current;
          const color = COLOR_MAP[activeColorRef.current];
          const pointer = opt.pointer ?? { x: 0, y: 0 };
          const start = startPointerRef.current;

          if (!isDrawingRef.current) return;
          isDrawingRef.current = false;

          if (tool === 'arrow') {
            // Draw line + arrowhead
            const dx = pointer.x - start.x;
            const dy = pointer.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 5) return; // Too short

            const line = new fabric.Line([start.x, start.y, pointer.x, pointer.y], {
              stroke: color,
              strokeWidth: 2,
              selectable: false,
              evented: false,
            });

            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const arrowHead = new fabric.Triangle({
              left: pointer.x,
              top: pointer.y,
              angle: angle + 90,
              width: 12,
              height: 12,
              fill: color,
              selectable: false,
              evented: false,
              originX: 'center',
              originY: 'center',
            } as any);

            const group = new fabric.Group([line, arrowHead], {
              selectable: true,
              evented: true,
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

          // Finalize circle/rectangle
          if (drawingObjectRef.current) {
            const obj = drawingObjectRef.current;
            obj.set({ selectable: true, evented: true });
            fabricCanvas.renderAll();
            drawingObjectRef.current = null;
            removedObjectsRef.current = [];
            updateCount();
          }
        });

        // Freehand: after drawing, tag the path
        fabricCanvas.on('path:created', (opt: any) => {
          const path = opt.path;
          if (path) {
            path.annotationId = generateId();
            path.semanticType = 'freehand';
            path.annotationColor = activeColorRef.current;
            removedObjectsRef.current = [];
            updateCount();
          }
        });
      };

      setup().catch(console.error);

      return () => {
        mounted = false;
        fabricCanvas?.dispose();
        fabricRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentImageUrl]);

    // Sync freehand mode and selection when tool changes
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
      <div
        ref={containerRef}
        data-testid="annotation-canvas-container"
        className="relative w-full flex-1 min-h-[500px] bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
            <div className="text-gray-400 text-sm animate-pulse">Loading document...</div>
          </div>
        )}
        <canvas ref={canvasRef} className="block" />
      </div>
    );
  }
);

AnnotationCanvas.displayName = 'AnnotationCanvas';
