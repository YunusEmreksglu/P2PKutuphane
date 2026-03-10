import express from 'express';
import cors from 'cors';
import { BOOKS_DIR } from './config.js';
import booksRouter from './routes/books.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/books', booksRouter);

app.listen(PORT, () => {
  console.log(`eKitap Server: http://localhost:${PORT}`);
});
