import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { DATA_DIR } from './config.js';

export interface BookNote {
  page: number;
  text: string;
  createdAt: string;
}

export interface BookData {
  filename: string;
  lastPage: number;
  totalPages: number;
  lastLocation: string;
  notes: BookNote[];
  lastRead: string;
}

const defaultData: BookData = {
  filename: '',
  lastPage: 1,
  totalPages: 0,
  lastLocation: '',
  notes: [],
  lastRead: new Date().toISOString(),
};

const dbCache = new Map<string, Low<BookData>>();

function sanitizeForPath(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function getBookDb(filename: string): Promise<Low<BookData>> {
  if (dbCache.has(filename)) {
    const db = dbCache.get(filename)!;
    await db.read();
    return db;
  }

  const jsonPath = path.join(DATA_DIR, `${sanitizeForPath(filename)}.json`);
  const adapter = new JSONFile<BookData>(jsonPath);
  const db = new Low(adapter, { ...defaultData, filename });

  await db.read();

  if (!db.data.filename) {
    db.data.filename = filename;
  }

  await db.write();
  dbCache.set(filename, db);

  return db;
}
