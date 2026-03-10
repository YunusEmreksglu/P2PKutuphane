import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface Props {
  url: string;
  initialPage: number;
  onPageChange: (page: number, total: number) => void;
}

export default function PdfReader({ url, initialPage, onPageChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const renderTaskRef = useRef<any>(null);

  // Load PDF
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      setLoading(true);
      try {
        const doc = await pdfjsLib.getDocument(url).promise;
        if (!cancelled) {
          setPdf(doc);
          setTotalPages(doc.numPages);
          const startPage = Math.min(initialPage, doc.numPages);
          setPage(startPage);
          onPageChange(startPage, doc.numPages);
        }
      } catch (err) {
        console.error('PDF yüklenemedi:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [url]);


  useEffect(() => {
    if (pdf && initialPage <= totalPages) {
      setPage(initialPage);
    }
  }, [initialPage, pdf, totalPages]);

  // Render page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch { }
      }

      try {
        const pdfPage = await pdf.getPage(page);
        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Sayfa render hatası:', err);
        }
      }
    };

    renderPage();
  }, [pdf, page, scale]);

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
        onPageChange(newPage, totalPages);
      }
    },
    [totalPages, onPageChange]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToPage(page + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPage(page - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, goToPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-2 bg-gray-800/80 border-b border-gray-700">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-40 text-sm"
        >
          ← Önceki
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 1 && val <= totalPages) goToPage(val);
            }}
            className="w-16 bg-gray-700 text-white text-center text-sm px-2 py-1 rounded border border-gray-600"
          />
          <span className="text-sm text-gray-400">/ {totalPages}</span>
        </div>

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-40 text-sm"
        >
          Sonraki →
        </button>

        <span className="text-gray-600">|</span>

        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
        >
          −
        </button>
        <span className="text-sm text-gray-400">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
        >
          +
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex justify-center p-4 bg-gray-950">
        <canvas ref={canvasRef} className="shadow-2xl" />
      </div>
    </div>
  );
}
