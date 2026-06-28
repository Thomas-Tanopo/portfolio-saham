import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api', routes);

app.get('/', (_req, res) => {
  res.json({ message: 'Portfolio Saham API' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
