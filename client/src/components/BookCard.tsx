import { Book } from '../types';

interface Props {
  book: Book;
  onClick: () => void;
}

const FORMAT_COLORS: Record<string, string> = {
  PDF: 'bg-red-500',
  EPUB: 'bg-green-500',
  MOBI: 'bg-blue-500',
  AZW3: 'bg-purple-500',
  KFX: 'bg-orange-500',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BookCard({ book, onClick }: Props) {
  const progress =
    book.totalPages > 0
      ? Math.round((book.lastPage / book.totalPages) * 100)
      : 0;

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-amber-400 transition cursor-pointer group"
    >
      {/* Cover placeholder */}
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-700 to-gray-800 flex flex-col items-center justify-center p-4 relative">
        <span
          className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded ${
            FORMAT_COLORS[book.format] || 'bg-gray-500'
          } text-white`}
        >
          {book.format}
        </span>
        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">
          📖
        </span>
        <p className="text-sm text-center text-gray-300 font-medium line-clamp-3">
          {book.title}
        </p>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium truncate text-white">{book.title}</p>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
          <span>{formatSize(book.size)}</span>
          {book.lastRead && <span>{formatDate(book.lastRead)}</span>}
        </div>

        {/* Progress bar */}
        {book.totalPages > 0 && (
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">%{progress} okundu</p>
          </div>
        )}
      </div>
    </div>
  );
}
