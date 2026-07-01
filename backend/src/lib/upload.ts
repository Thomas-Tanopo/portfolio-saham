import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
ensureDir(UPLOAD_DIR);

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPG/PNG/WEBP) yang diizinkan'));
  }
};

const limits = { fileSize: 6 * 1024 * 1024 };

export function createUpload(subfolder?: string) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      let dest = UPLOAD_DIR;
      if (subfolder) {
        dest = path.join(UPLOAD_DIR, subfolder);
      } else if (process.env.UPLOAD_ORGANIZE === 'true') {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        dest = path.join(UPLOAD_DIR, 'transaksi', month);
      }
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const prefix = subfolder || 'transaksi';
      const name = `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });

  return multer({ storage, fileFilter, limits });
}

const upload = createUpload();
export default upload;
