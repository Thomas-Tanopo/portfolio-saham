import { Request, Response } from 'express';

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: 'Tidak ada file yang diupload' });
    return;
  }
  res.json({ filename: req.file.filename });
}
