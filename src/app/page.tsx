'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropZone } from '@/components/upload/DropZone';

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error ?? 'Upload failed. Please try again.');
          return;
        }
        router.push(`/analyze/${json.docId}`);
      } catch {
        setError('Network error. Please check your connection and try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
            VF
          </div>
          <h1 className="text-lg font-semibold">Visual Finance Analyzer</h1>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full space-y-10">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              Annotate. Ask. Understand.
            </h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto">
              Upload a financial document, draw annotations on it, and let Claude extract
              structured insights from your visual prompts.
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Red circle = focus on this value',
              'Yellow box = extract this section',
              'Blue arrow = analyze this trend',
              'Green text = ask a question',
            ].map((label) => (
              <span
                key={label}
                className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-gray-300"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Upload zone */}
          <div className="space-y-3">
            <DropZone onUpload={handleUpload} />
            {isUploading && (
              <p className="text-center text-sm text-blue-400 animate-pulse">
                Uploading and preparing document...
              </p>
            )}
            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Sample docs hint */}
          <p className="text-center text-xs text-gray-600">
            Try it with an earnings report, 10-K filing, or chart screenshot.
            See <code className="text-gray-500">public/sample-docs/</code> for sample documents.
          </p>
        </div>
      </main>
    </div>
  );
}
