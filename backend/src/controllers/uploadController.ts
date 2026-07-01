import { Request, Response } from 'express';
import path from 'path';
import { UPLOAD_DIR } from '../lib/upload';

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: 'Tidak ada file yang diupload' });
    return;
  }
  const relativePath = path.relative(UPLOAD_DIR, req.file.path).replace(/\\/g, '/');
  res.json({ filename: relativePath });
}
