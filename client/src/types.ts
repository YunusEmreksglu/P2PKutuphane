export interface Book {
  filename: string;
  title: string;
  format: string;
  size: number;
  lastPage: number;
  totalPages: number;
  lastRead: string;
}

export interface BookNote {
  page: number;           // PDF: sayfa no; EPUB: bölüm içi sayfa no
  text: string;
  createdAt: string;
  // EPUB'a özel alanlar
  chapterTitle?: string;  // bölüm başlığı
  globalPage?: number;    // kitabın tamamındaki global konum
  globalTotal?: number;   // toplam global konum sayısı
  cfi?: string;           // EPUB CFI (gezinme için)
}

export interface BookData {
  filename: string;
  lastPage: number;
  totalPages: number;
  lastLocation: string;
  notes: BookNote[];
  lastRead: string;
}
