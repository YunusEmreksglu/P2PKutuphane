import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const BOOKS_DIR = path.join(ROOT_DIR, 'books');
export const DATA_DIR = path.join(ROOT_DIR, 'data');

mkdirSync(BOOKS_DIR, { recursive: true });
mkdirSync(DATA_DIR, { recursive: true });
