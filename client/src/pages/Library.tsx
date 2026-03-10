import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { fetchBooks, uploadBooks } from '../api';
import BookCard from '../components/BookCard';

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const loadBooks = useCallback(async () => {
    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (err) {
      console.error('Kitaplar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleUpload = async (files: FileList | File[]) => {
    try {
      await uploadBooks(files);
      await loadBooks();
    } catch (err) {
      console.error('Yükleme hatası:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const filteredBooks = books.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="min-h-screen bg-gray-900"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-400">📚 eKitap</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Kitap ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-amber-400 focus:outline-none w-64"
            />
            <label className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold px-4 py-2 rounded-lg cursor-pointer transition">
              📁 Kitap Ekle
              <input
                type="file"
                multiple
                accept=".pdf,.epub,.mobi,.azw3,.kfx"
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </label>
          </div>
        </div>
      </header>

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-amber-500/20 border-4 border-dashed border-amber-400 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-800 rounded-2xl px-8 py-6 shadow-2xl">
            <p className="text-2xl text-amber-400 font-bold">
              Kitapları buraya bırakın
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">📖</p>
            <p className="text-xl text-gray-400">
              {books.length === 0
                ? 'Henüz kitap eklenmemiş. Kitap eklemek için yukarıdaki butonu kullanın veya dosyaları sürükleyip bırakın.'
                : 'Aramanızla eşleşen kitap bulunamadı.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.filename}
                book={book}
                onClick={() =>
                  navigate(`/read/${encodeURIComponent(book.filename)}`)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
