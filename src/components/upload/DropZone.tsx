'use client';

import { useCallback, useState, useRef } from 'react';
import { validateFile } from '@/utils/fileValidation';

interface DropZoneProps {
  onUpload: (file: File) => void;
}

export function DropZone({ onUpload }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const validation = validateFile(file.type, file.size);
      if (!validation.valid) {
        setError(validation.error ?? 'Invalid file.');
        return;
      }
      setIsUploading(true);
      try {
        await onUpload(file);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      data-testid="drop-zone"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[280px] rounded-2xl border-2 border-dashed
        cursor-pointer transition-all duration-200 p-8
        ${isDragging ? 'border-blue-400 bg-blue-50/10 scale-[1.01]' : 'border-gray-600 hover:border-gray-400 bg-gray-900/50'}
      `}
      role="button"
      aria-label="Upload financial document"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={onInputChange}
        data-testid="file-input"
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div>
          <p className="text-lg font-semibold text-gray-100">
            {isUploading ? 'Uploading...' : 'Drop your document here'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            PDF, PNG, JPG, WEBP — up to 20MB
          </p>
        </div>

        {!isUploading && (
          <span className="text-xs text-blue-400 border border-blue-400/30 rounded-full px-4 py-1">
            Or click to browse
          </span>
        )}
      </div>

      {error && (
        <div
          data-testid="error-message"
          className="absolute bottom-4 left-4 right-4 bg-red-900/80 border border-red-500 rounded-lg px-4 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      )}
    </div>
  );
}
