import { Book, BookData } from './types';

const API_BASE = '/api/books';

export async function fetchBooks(): Promise<Book[]> {
  const res = await fetch(API_BASE);
  return res.json();
}

export async function uploadBooks(files: FileList | File[]): Promise<void> {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('books', file));
  await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
}

export async function getBookData(filename: string): Promise<BookData> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(filename)}/data`);
  return res.json();
}

export async function updateBookData(
  filename: string,
  data: Partial<BookData>
): Promise<BookData> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(filename)}/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export function getBookFileUrl(filename: string): string {
  return `/api/books/${encodeURIComponent(filename)}/file`;
}
