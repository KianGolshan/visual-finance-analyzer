'use client';

import { useMemo } from 'react';
import type { AnnotationType, AnnotationColor } from '@/types/annotations';

export interface ToolbarProps {
  activeTool: AnnotationType;
  activeColor: AnnotationColor;
  annotationCount: number;
  onToolChange: (tool: AnnotationType) => void;
  onColorChange: (color: AnnotationColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const TOOLS: { id: AnnotationType; label: string; icon: string }[] = [
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'rectangle', label: 'Rectangle', icon: '□' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'text', label: 'Text Label', icon: 'T' },
  { id: 'freehand', label: 'Freehand', icon: '✏' },
];

const COLORS: { id: AnnotationColor; hex: string; label: string }[] = [
  { id: 'red', hex: '#ef4444', label: 'Red — Focus' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow — Extract' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue — Trend' },
  { id: 'green', hex: '#22c55e', label: 'Green — Question' },
];

export function AnnotationToolbar({
  activeTool,
  activeColor,
  annotationCount,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  onClear,
}: ToolbarProps) {
  const mod = useMemo(
    () => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'),
    []
  );

  return (
    <div
      data-testid="annotation-toolbar"
      className="flex flex-wrap items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-xl"
    >
      {/* Tool selector */}
      <div className="flex gap-1" data-testid="tool-buttons">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            data-testid={`tool-${tool.id}`}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className={`
              w-9 h-9 rounded-lg text-sm font-bold transition-all
              ${activeTool === tool.id
                ? 'bg-blue-600 text-white active-tool'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-700" />

      {/* Color picker */}
      <div className="flex gap-1" data-testid="color-buttons">
        {COLORS.map((color) => (
          <button
            key={color.id}
            data-testid={`color-${color.id}`}
            onClick={() => onColorChange(color.id)}
            title={color.label}
            className={`
              w-7 h-7 rounded-full transition-all
              ${activeColor === color.id ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}
            `}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-700" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        title={`Undo (${mod}+Z)`}
        className="px-3 h-9 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm"
      >
        ↩
      </button>
      <button
        onClick={onRedo}
        title={`Redo (${mod}+Shift+Z)`}
        className="px-3 h-9 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm"
      >
        ↪
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        title="Clear all annotations"
        className="px-3 h-9 rounded-lg bg-gray-800 text-red-400 hover:bg-gray-700 text-sm"
      >
        Clear
      </button>

      {/* Annotation count badge */}
      <div className="ml-auto flex items-center gap-2">
        <span
          data-testid="annotation-count"
          className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.5rem] text-center"
        >
          {annotationCount}
        </span>
        <span className="text-gray-400 text-xs">annotations</span>
      </div>
    </div>
  );
}
