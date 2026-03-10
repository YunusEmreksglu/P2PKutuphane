import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { readdirSync, statSync, existsSync } from 'fs';
import { BOOKS_DIR } from '../config.js';
import { getBookDb } from '../storage.js';

const router = Router();

const SUPPORTED_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.azw3', '.kfx'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BOOKS_DIR),
  filename: (_req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const safeName = path.basename(originalName);
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Desteklenmeyen dosya formatı: ${ext}`));
    }
  },
});

// Kitapları listele
router.get('/', async (_req, res) => {
  try {
    const files = readdirSync(BOOKS_DIR);
    const books = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

      const filePath = path.join(BOOKS_DIR, file);
      const stat = statSync(filePath);
      const db = await getBookDb(file);

      books.push({
        filename: file,
        title: path.basename(file, ext),
        format: ext.replace('.', '').toUpperCase(),
        size: stat.size,
        lastPage: db.data.lastPage,
        totalPages: db.data.totalPages,
        lastRead: db.data.lastRead,
      });
    }

    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'Kitaplar listelenemedi' });
  }
});

// Kitap yükle
router.post('/upload', upload.array('books', 20), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Dosya yüklenmedi' });
    return;
  }
  res.json({
    message: `${files.length} kitap yüklendi`,
    files: files.map((f) => f.filename),
  });
});

// Kitap dosyasını getir
router.get('/:filename/file', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.resolve(BOOKS_DIR, filename);

  if (!filePath.startsWith(path.resolve(BOOKS_DIR))) {
    res.status(403).json({ error: 'Erişim reddedildi' });
    return;
  }

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'Dosya bulunamadı' });
    return;
  }

  res.sendFile(filePath);
});

// Kitap verisini getir (ilerleme, notlar vs.)
router.get('/:filename/data', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const db = await getBookDb(filename);
    res.json(db.data);
  } catch (error) {
    res.status(500).json({ error: 'Kitap verileri alınamadı' });
  }
});

// Kitap verisini güncelle
router.put('/:filename/data', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const db = await getBookDb(filename);

    const { lastPage, totalPages, lastLocation, notes } = req.body;

    if (lastPage !== undefined) db.data.lastPage = lastPage;
    if (totalPages !== undefined) db.data.totalPages = totalPages;
    if (lastLocation !== undefined) db.data.lastLocation = lastLocation;
    if (notes !== undefined) db.data.notes = notes;
    db.data.lastRead = new Date().toISOString();

    await db.write();
    res.json(db.data);
  } catch (error) {
    res.status(500).json({ error: 'Kitap verileri kaydedilemedi' });
  }
});

// Kitabı sil
router.delete('/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.resolve(BOOKS_DIR, filename);

    if (!filePath.startsWith(path.resolve(BOOKS_DIR))) {
      res.status(403).json({ error: 'Erişim reddedildi' });
      return;
    }

    const { unlinkSync } = await import('fs');
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    res.json({ message: 'Kitap silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Kitap silinemedi' });
  }
});

export default router;
