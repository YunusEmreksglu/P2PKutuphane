import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import ePub from 'epubjs';

interface TocItem {
  id: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

export interface EpubReaderHandle {
  display: (target: string) => void;
}

interface Props {
  url: string;
  initialLocation: string;
  onLocationChange: (
    cfi: string,
    chapterTitle: string,
    chapterPage: number,
    chapterTotal: number,
    globalPage: number,
    globalTotal: number,
  ) => void;
}

/** TOC ağacında href'e en yakın girdiyi bulur */
function findTocLabel(items: TocItem[], href: string): string {
  const base = href.split('?')[0].split('#')[0];
  for (const item of items) {
    if (item.href.split('?')[0].split('#')[0] === base) return item.label.trim();
    if (item.subitems?.length) {
      const found = findTocLabel(item.subitems, href);
      if (found) return found;
    }
  }
  return '';
}

const EpubReader = forwardRef<EpubReaderHandle, Props>(function EpubReader(
  { url, initialLocation, onLocationChange },
  ref,
) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  const locationsRef = useRef<any>(null);
  const tocRef = useRef<TocItem[]>([]);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [activeHref, setActiveHref] = useState('');

  useImperativeHandle(ref, () => ({
    display: (target: string) => renditionRef.current?.display(target),
  }));

  useEffect(() => {
    if (!viewerRef.current) return;

    const book = ePub(url, { openAs: 'epub' });
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
    });
    renditionRef.current = rendition;

    rendition.themes.default({
      body: {
        color: '#e5e7eb !important',
        background: '#111827 !important',
        'font-family': 'system-ui, -apple-system, sans-serif !important',
        'line-height': '1.8 !important',
        padding: '20px !important',
      },
      p:  { color: '#e5e7eb !important', 'line-height': '1.8 !important' },
      h1: { color: '#fbbf24 !important' },
      h2: { color: '#fbbf24 !important' },
      h3: { color: '#fbbf24 !important' },
      a:  { color: '#60a5fa !important' },
    });

    // TOC yükle
    book.loaded.navigation.then((nav: any) => {
      const items: TocItem[] = nav.toc || [];
      setToc(items);
      tocRef.current = items;
    });

    // Global konum indeksi oluştur (arka planda, sayfa atlamayı önlemek için
    // displayed.page ile başlıyoruz; indeks hazır olunca güncellenir)
    (book as any).ready
      .then(() => (book.locations as any).generate(1600))
      .then(() => {
        locationsRef.current = book.locations;
        try {
          const loc = renditionRef.current?.currentLocation?.();
          if (loc?.start?.cfi) {
            const chapterPage  = loc.start?.displayed?.page  || 1;
            const chapterTotal = loc.start?.displayed?.total || 1;
            const href         = loc.start?.href || '';
            const chapterTitle = findTocLabel(tocRef.current, href);
            const globalPage   = ((locationsRef.current as any).locationFromCfi(loc.start.cfi) || 0) + 1;
            const globalTotal  = (locationsRef.current as any).length();
            onLocationChange(loc.start.cfi, chapterTitle, chapterPage, chapterTotal, globalPage, globalTotal);
          }
        } catch {}
      });

    if (initialLocation) {
      rendition.display(initialLocation);
    } else {
      rendition.display();
    }

    rendition.on('relocated', (location: any) => {
      try {
        const cfi          = location.start?.cfi  || '';
        const href         = location.start?.href || '';
        setActiveHref(href);

        // Bölüm içi sayfa — epubjs'in smooth sayacı (atlamaz)
        const chapterPage  = location.start?.displayed?.page  || 1;
        const chapterTotal = location.start?.displayed?.total || 1;
        const chapterTitle = findTocLabel(tocRef.current, href);

        // Global konum — indeks hazırsa kullan, değilse bölüm değerini geçici kullan
        let globalPage: number;
        let globalTotal: number;
        if (locationsRef.current && (locationsRef.current as any).length?.() > 0) {
          globalPage  = ((locationsRef.current as any).locationFromCfi(cfi) || 0) + 1;
          globalTotal = (locationsRef.current as any).length();
        } else {
          globalPage  = chapterPage;
          globalTotal = chapterTotal;
        }

        onLocationChange(cfi, chapterTitle, chapterPage, chapterTotal, globalPage, globalTotal);
      } catch {}
    });

    rendition.on('keyup', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') rendition.next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   rendition.prev();
    });

    return () => {
      renditionRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current?.destroy();
      bookRef.current = null;
      if (viewerRef.current) viewerRef.current.innerHTML = '';
    };
  }, [url]);

  const prevPage   = useCallback(() => renditionRef.current?.prev(), []);
  const nextPage   = useCallback(() => renditionRef.current?.next(), []);
  const navigateTo = useCallback((href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage(); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); prevPage(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPage, nextPage]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* İçindekiler sidebar */}
      {showToc && toc.length > 0 && (
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
            <h2 className="text-sm font-semibold text-amber-400">İçindekiler</h2>
            <button onClick={() => setShowToc(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {toc.map((item) => (
              <TocEntry key={item.id} item={item} onNavigate={navigateTo} activeHref={activeHref} />
            ))}
          </div>
        </div>
      )}

      {/* Okuyucu */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between py-2 px-3 bg-gray-800/80 border-b border-gray-700 shrink-0">
          <button
            onClick={() => setShowToc(!showToc)}
            className={`px-3 py-1 rounded text-sm transition ${showToc ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            ☰ İçindekiler
          </button>
          <div className="flex gap-2">
            <button onClick={prevPage} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">← Önceki</button>
            <button onClick={nextPage} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">Sonraki →</button>
          </div>
        </div>
        <div ref={viewerRef} className="flex-1 overflow-hidden bg-gray-900" />
      </div>
    </div>
  );
});

export default EpubReader;

function TocEntry({
  item, onNavigate, activeHref, depth = 0,
}: {
  item: TocItem; onNavigate: (href: string) => void; activeHref: string; depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!item.subitems?.length;
  const isActive = activeHref !== '' && item.href.split('#')[0] === activeHref.split('?')[0];

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 hover:bg-gray-700 cursor-pointer group ${isActive ? 'bg-gray-700/60' : ''}`}
        style={{ paddingLeft: `${12 + depth * 14}px`, paddingRight: '12px' }}
        onClick={() => onNavigate(item.href)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            className="text-gray-500 hover:text-gray-300 text-xs w-4 shrink-0"
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className={`text-sm truncate ${isActive ? 'text-amber-400 font-medium' : 'text-gray-300 group-hover:text-white'}`}>
          {item.label.trim()}
        </span>
      </div>
      {hasChildren && open && item.subitems!.map((sub) => (
        <TocEntry key={sub.id} item={sub} onNavigate={onNavigate} activeHref={activeHref} depth={depth + 1} />
      ))}
    </div>
  );
}
