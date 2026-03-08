'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { AnnotationCanvas, type AnnotationCanvasHandle } from '@/components/canvas/AnnotationCanvas';
import { AnnotationToolbar } from '@/components/canvas/AnnotationToolbar';
import { AnalysisPanel } from '@/components/results/AnalysisPanel';
import type { AnnotationColor, AnnotationType } from '@/types/annotations';
import type { AnalyzeResponse, ChatMessage } from '@/types/analysis';
import type { DocumentMeta } from '@/types/documents';

interface PageProps {
  params: Promise<{ docId: string }>;
}

export default function AnalyzePage({ params }: PageProps) {
  const { docId } = use(params);
  const router = useRouter();

  const [meta, setMeta] = useState<DocumentMeta | null>(null);
  const [docStatus, setDocStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [documentImageUrl, setDocumentImageUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const [activeTool, setActiveTool] = useState<AnnotationType>('rectangle');
  const [activeColor, setActiveColor] = useState<AnnotationColor>('red');
  const [annotationCount, setAnnotationCount] = useState(0);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const canvasRef = useRef<AnnotationCanvasHandle>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Fetch document metadata
  useEffect(() => {
    fetch(`/api/upload?docId=${docId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMeta(data.meta);
        } else {
          setDocStatus('error');
        }
      })
      .catch(() => setDocStatus('error'));
  }, [docId]);

  // Reset annotation count when document changes
  useEffect(() => {
    setAnnotationCount(0);
  }, [documentImageUrl]);

  // Load the document once metadata is available
  useEffect(() => {
    if (!meta) return;

    const loadDocument = async () => {
      const fileUrl = `/api/file/${meta.docId}`;

      if (meta.mimeType === 'application/pdf') {
        await loadPdf(fileUrl, currentPage);
      } else {
        // Image document
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        const dataUrl = await blobToDataUrl(blob);
        setDocumentImageUrl(dataUrl);
        setDocStatus('ready');
      }
    };

    loadDocument().catch(() => setDocStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, currentPage]);

  const loadPdf = async (fileUrl: string, page: number) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const resp = await fetch(fileUrl);
      const arrayBuffer = await resp.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdfDoc.numPages);

      const pdfPage = await pdfDoc.getPage(page);
      const viewport = pdfPage.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;

      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
      setDocumentImageUrl(canvas.toDataURL('image/png'));
      setDocStatus('ready');
    } catch {
      setDocStatus('error');
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMetaKey = e.metaKey || e.ctrlKey;
      if (!isMetaKey) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvasRef.current?.undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        canvasRef.current?.redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!canvasRef.current) return;
    setAnalysisError(null);
    setIsAnalyzing(true);

    try {
      const imageBase64 = canvasRef.current.getImageDataUrl();
      const annotations = canvasRef.current.getAnnotations();
      const { width: canvasWidth, height: canvasHeight } = canvasRef.current.getCanvasDimensions();

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          annotationMetadata: {
            annotations,
            canvasWidth,
            canvasHeight,
            documentPage: currentPage,
          },
        }),
      });

      const data: AnalyzeResponse = await res.json();
      if (!data.success) {
        setAnalysisError(data.error ?? 'Analysis failed');
        return;
      }
      setAnalysisResult(data);
      setChatHistory([]);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Network error during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentPage]);

  const handleFollowUp = useCallback(
    async (question: string) => {
      if (!canvasRef.current || !analysisResult) return;
      setChatError(null);
      setChatInput(question);
      setIsChatLoading(true);

      const imageBase64 = canvasRef.current.getImageDataUrl();
      const { width: canvasWidth, height: canvasHeight } = canvasRef.current.getCanvasDimensions();

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            annotationMetadata: {
              annotations: canvasRef.current.getAnnotations(),
              canvasWidth,
              canvasHeight,
              documentPage: currentPage,
            },
            followUpQuestion: question,
            conversationHistory: chatHistory,
          }),
        });

        const data: AnalyzeResponse = await res.json();
        const assistantMsg = data.rawText ?? 'No response.';

        setChatHistory([
          ...chatHistory,
          { role: 'user', content: question },
          { role: 'assistant', content: assistantMsg },
        ]);
        setChatInput('');
      } catch {
        setChatError('Chat request failed. Please try again.');
      } finally {
        setIsChatLoading(false);
      }
    },
    [chatHistory, analysisResult, currentPage]
  );

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) handleFollowUp(chatInput.trim());
  };

  if (docStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">Could not load document.</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-400 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm text-gray-400 truncate">{meta?.originalFileName ?? '...'}</span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2 ml-auto text-sm">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40"
            >
              ‹
            </button>
            <span className="text-gray-400">
              Page {currentPage} / {pageCount}
            </span>
            <button
              disabled={currentPage >= pageCount}
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Canvas panel */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Toolbar — fixed at top */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <AnnotationToolbar
              activeTool={activeTool}
              activeColor={activeColor}
              annotationCount={annotationCount}
              onToolChange={setActiveTool}
              onColorChange={setActiveColor}
              onUndo={() => canvasRef.current?.undo()}
              onRedo={() => canvasRef.current?.redo()}
              onClear={() => canvasRef.current?.clear()}
            />
          </div>

          {/* Canvas — scrollable, fills remaining height */}
          <div className="flex-1 overflow-y-auto px-4 bg-gray-950">
            {documentImageUrl ? (
              <AnnotationCanvas
                ref={canvasRef}
                documentImageUrl={documentImageUrl}
                activeTool={activeTool}
                activeColor={activeColor}
                onAnnotationCountChange={setAnnotationCount}
              />
            ) : (
              <div className="h-full min-h-[500px] bg-gray-900 rounded-xl flex items-center justify-center">
                <div className="text-gray-500 text-sm animate-pulse">
                  {docStatus === 'loading' ? 'Loading document...' : 'No document loaded.'}
                </div>
              </div>
            )}
          </div>

          {/* Analyze button — fixed at bottom */}
          <div className="px-4 py-3 shrink-0 border-t border-gray-800 bg-gray-950">
            <div className="flex items-center gap-3">
              <button
                data-testid="analyze-button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !documentImageUrl}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-colors"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Document'}
              </button>
              {annotationCount === 0 && documentImageUrl && (
                <span className="text-xs text-gray-500">
                  Draw annotations first, or analyze the whole document.
                </span>
              )}
            </div>
            {analysisError && (
              <p className="text-sm text-red-400 mt-2">{analysisError}</p>
            )}
          </div>
        </div>

        {/* Right: Results panel */}
        <div className="w-[420px] border-l border-gray-800 flex flex-col p-4 gap-4 overflow-hidden">
          {analysisResult ? (
            <>
              {/* Analysis results */}
              <div className="flex-1 overflow-y-auto">
                <AnalysisPanel
                  data={analysisResult.data!}
                  rawText={analysisResult.rawText ?? ''}
                  onFollowUpQuestion={(q) => {
                    setChatInput(q);
                    chatInputRef.current?.focus();
                    handleFollowUp(q);
                  }}
                />
              </div>

              {/* Follow-up chat */}
              <div className="border-t border-gray-800 pt-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Follow-up Chat
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`text-xs px-3 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-900/40 text-blue-100 ml-4'
                          : 'bg-gray-800 text-gray-200 mr-4'
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="text-xs text-gray-500 animate-pulse px-3">
                      Thinking...
                    </div>
                  )}
                </div>
                {chatError && <p className="text-xs text-red-400">{chatError}</p>}
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">No analysis yet</p>
                <p className="text-xs mt-1">
                  Draw annotations on the document, then click{' '}
                  <strong className="text-gray-400">Analyze Document</strong>.
                </p>
              </div>
              <div className="space-y-1 text-xs text-left w-full max-w-xs">
                <p className="text-gray-400 font-medium">Annotation semantics:</p>
                {[
                  { color: 'bg-red-500', label: 'Red — Focus on this value' },
                  { color: 'bg-yellow-500', label: 'Yellow — Extract this section' },
                  { color: 'bg-blue-500', label: 'Blue — Analyze this trend' },
                  { color: 'bg-green-500', label: 'Green — Your question/note' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
