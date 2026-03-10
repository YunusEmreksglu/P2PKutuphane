import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookData, BookNote } from '../types';
import { getBookData, updateBookData, getBookFileUrl } from '../api';
import PdfReader from '.././components/PdfReader';
import EpubReader, { EpubReaderHandle } from '.././components/EpubReader';

export default function Reader() {
    const { filename } = useParams<{ filename: string }>();
    const navigate = useNavigate();
    const decodedFilename = decodeURIComponent(filename || '');

    const [bookData, setBookData] = useState<BookData | null>(null);
    const [showNotes, setShowNotes] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    // EPUB'a özel anlık konum bilgisi
    const [epubChapterTitle, setEpubChapterTitle] = useState('');
    const [epubChapterPage, setEpubChapterPage] = useState(1);
    const [epubChapterTotal, setEpubChapterTotal] = useState(1);
    const [epubGlobalPage, setEpubGlobalPage] = useState(0);
    const [epubGlobalTotal, setEpubGlobalTotal] = useState(0);
    const [epubCfi, setEpubCfi] = useState('');
    const epubReaderRef = useRef<EpubReaderHandle>(null);

    const ext = decodedFilename.split('.').pop()?.toLowerCase() || '';
    const fileUrl = getBookFileUrl(decodedFilename);

    useEffect(() => {
        if (!decodedFilename) return;
        getBookData(decodedFilename).then((data) => {
            setBookData(data);
            setCurrentPage(data.lastPage || 1);
            setTotalPages(data.totalPages || 0);
        });
    }, [decodedFilename]);

    const saveProgress = useCallback(
        async (page: number, total?: number) => {
            setCurrentPage(page);
            if (total) setTotalPages(total);
            await updateBookData(decodedFilename, {
                lastPage: page,
                ...(total ? { totalPages: total } : {}),
            });
            console.log(`Progress saved: Page ${page}${total ? ` of ${total}` : ''}`);
        },
        [decodedFilename, setCurrentPage, currentPage, totalPages]
    );

    const saveEpubLocation = useCallback(
        async (
            cfi: string,
            chapterTitle: string,
            chapterPage: number,
            chapterTotal: number,
            globalPage: number,
            globalTotal: number,
        ) => {
            setEpubCfi(cfi);
            setEpubChapterTitle(chapterTitle);
            setEpubChapterPage(chapterPage);
            setEpubChapterTotal(chapterTotal);
            setEpubGlobalPage(globalPage);
            setEpubGlobalTotal(globalTotal);
            setCurrentPage(globalPage);
            setTotalPages(globalTotal);
            await updateBookData(decodedFilename, {
                lastLocation: cfi,
                lastPage: globalPage,
                totalPages: globalTotal,
            });
        },
        [decodedFilename]
    );

    const addNote = async () => {
        if (!noteText.trim() || !bookData) return;
        const newNote: BookNote = ext === 'epub'
            ? {
                page: epubChapterPage,
                text: noteText.trim(),
                createdAt: new Date().toISOString(),
                chapterTitle: epubChapterTitle,
                globalPage: epubGlobalPage,
                globalTotal: epubGlobalTotal,
                cfi: epubCfi,
              }
            : {
                page: currentPage,
                text: noteText.trim(),
                createdAt: new Date().toISOString(),
              };
        const updatedNotes = [...(bookData.notes || []), newNote];
        const updated = await updateBookData(decodedFilename, {
            notes: updatedNotes,
        });
        setBookData(updated);
        setNoteText('');
    };

    const deleteNote = async (index: number) => {
        if (!bookData) return;
        const updatedNotes = bookData.notes.filter((_, i) => i !== index);
        const updated = await updateBookData(decodedFilename, {
            notes: updatedNotes,
        });
        setBookData(updated);
    };

    // EPUB için bölüm başlığı + bölüm sayfasına göre filtrele; PDF için sayfa numarasına göre
    const currentPageNotes = bookData?.notes?.filter((n) =>
        ext === 'epub'
            ? (n.chapterTitle === epubChapterTitle && n.page === epubChapterPage)
            : n.page === currentPage
    ) || [];
    const otherNotes = bookData?.notes.filter((n) =>
        ext === 'epub'
            ? !(n.chapterTitle === epubChapterTitle && n.page === epubChapterPage)
            : n.page !== currentPage
    ) || [];

    if (!decodedFilename || !bookData) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
            </div>
        );
    }

    const isSupported = ['pdf', 'epub'].includes(ext);

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            {/* Toolbar */}
            <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="text-gray-400 hover:text-white transition text-sm"
                    >
                        ← Kütüphane
                    </button>
                    <span className="text-gray-600">|</span>
                    <h1 className="text-sm font-medium text-white truncate max-w-md">
                        {decodedFilename.replace(/\.[^.]+$/, '')}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {ext === 'epub' && epubChapterTitle ? (
                        <div className="text-right">
                            <p className="text-xs text-gray-300 truncate max-w-xs">{epubChapterTitle}</p>
                            <p className="text-xs text-gray-500">
                                S.{epubChapterPage}/{epubChapterTotal}
                                {epubGlobalTotal > 0 && (
                                    <span className="ml-1">(Genel: {epubGlobalPage}/{epubGlobalTotal})</span>
                                )}
                            </p>
                        </div>
                    ) : totalPages > 0 ? (
                        <span className="text-sm text-gray-400">
                            Sayfa {currentPage} / {totalPages}
                        </span>
                    ) : null}
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className={`px-3 py-1 rounded text-sm transition ${showNotes
                                ? 'bg-amber-500 text-gray-900'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        📝 Notlar {otherNotes.length > 0 && `(${otherNotes.length})`}
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Reader area */}
                <div className={`flex-1 ${ext === 'epub' ? 'overflow-hidden' : 'overflow-auto'}`}>
                    {ext === 'pdf' && (
                        <PdfReader
                            url={fileUrl}
                            initialPage={currentPage}
                            onPageChange={saveProgress}
                        />
                    )}
                    {ext === 'epub' && (
                        <EpubReader
                            ref={epubReaderRef}
                            url={fileUrl}
                            initialLocation={bookData?.lastLocation || ''}
                            onLocationChange={saveEpubLocation}
                        />
                    )}
                    {!isSupported && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <p className="text-6xl mb-4">📄</p>
                                <p className="text-xl text-gray-400">
                                    {ext.toUpperCase()} formatı henüz doğrudan
                                    desteklenmiyor.
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Bu formatı okumak için EPUB veya PDF'e dönüştürmeniz
                                    önerilir.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notes panel */}
                {showNotes && (
                    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-amber-400">Notlar</h2>
                            {ext === 'epub' && epubChapterTitle ? (
                                <div className="mt-1">
                                    <p className="text-xs text-gray-300 font-medium truncate">{epubChapterTitle}</p>
                                    <p className="text-xs text-gray-500">
                                        Sayfa {epubChapterPage}/{epubChapterTotal}
                                        {epubGlobalTotal > 0 && (
                                            <span className="ml-1 text-gray-600">(Genel: {epubGlobalPage}/{epubGlobalTotal})</span>
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 mt-1">Sayfa {currentPage}</p>
                            )}
                        </div>

                        {/* Add note */}
                        <div className="p-4 border-b border-gray-700">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder={
                                    ext === 'epub' && epubChapterTitle
                                        ? `${epubChapterTitle} — S.${epubChapterPage} için not...`
                                        : 'Bu sayfa için not ekle...'
                                }
                                className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-amber-400 focus:outline-none resize-none"
                                rows={3}
                            />
                            <button
                                onClick={addNote}
                                disabled={!noteText.trim()}
                                className="mt-2 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:text-gray-400 text-gray-900 font-medium text-sm py-1.5 rounded transition"
                            >
                                Not Ekle
                            </button>
                        </div>

                        {/* Notes list */}
                        <div className="flex-1 overflow-auto p-4 space-y-3">
                            {currentPageNotes.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                                        Bu Sayfa
                                    </h3>
                                    {currentPageNotes.map((note, i) => {
                                        const globalIndex = otherNotes.indexOf(note);
                                        return (
                                            <div key={i} className="bg-gray-700 rounded p-3 mb-2">
                                                <p className="text-sm text-gray-200">{note.text}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(note.createdAt).toLocaleDateString(
                                                            'tr-TR'
                                                        )}
                                                    </span>
                                                    <button
                                                        onClick={() => deleteNote(globalIndex)}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {otherNotes.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                                        Tüm Notlar
                                    </h3>
                                    {otherNotes.map((note, i) => {
                                        const globalIdx = bookData!.notes.indexOf(note);
                                        return (
                                        <div key={i} className="bg-gray-700/50 rounded p-3 mb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    {ext === 'epub' && note.chapterTitle ? (
                                                        <>
                                                            <span className="text-xs text-amber-400 font-medium truncate">{note.chapterTitle}</span>
                                                            <span className="text-xs text-gray-500">
                                                                S.{note.page}/{note.globalTotal ?? '?'}
                                                                <span className="ml-1">(Genel: {note.globalPage ?? '?'}/{note.globalTotal ?? '?'})</span>
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-amber-400">Sayfa {note.page}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <button
                                                        onClick={() =>
                                                            ext === 'epub' && note.cfi
                                                                ? epubReaderRef.current?.display(note.cfi)
                                                                : saveProgress(note.page, totalPages)
                                                        }
                                                        className="text-xs text-amber-400 hover:text-amber-300"
                                                    >
                                                        Git
                                                    </button>
                                                    <button
                                                        onClick={() => deleteNote(globalIdx)}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-300">{note.text}</p>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}

                            {(otherNotes.length === 0 && currentPageNotes.length === 0) && (
                                <p className="text-sm text-gray-500 text-center mt-8">
                                    Henüz not eklenmemiş
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
