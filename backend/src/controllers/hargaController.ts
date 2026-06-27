import { Request, Response } from 'express';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

export async function getHarga(req: Request, res: Response) {
  const kode = req.params.kode as string;
  try {
    const symbol = kode.endsWith('.JK') ? kode : `${kode}.JK`;
    const quote = await yf.quote(symbol);
    const price = (quote as any).regularMarketPrice;
    if (price == null) {
      return res.status(404).json({ message: `Harga untuk ${kode} tidak ditemukan` });
    }
    res.json({ kode, harga: price });
  } catch (err: any) {
    console.error(`Yahoo Finance error for ${kode}:`, err.message);
    res.status(500).json({ message: `Gagal mengambil harga ${kode}` });
  }
}

export async function getHargaBatch(req: Request, res: Response) {
  const { kodes } = req.body;
  if (!Array.isArray(kodes) || kodes.length === 0) {
    return res.status(400).json({ message: 'Kodes harus array' });
  }
  try {
    const symbols = kodes.map((k: string) => (k.endsWith('.JK') ? k : `${k}.JK`));
    const quotes = await yf.quote(symbols);
    const result: Record<string, number> = {};
    const list = Array.isArray(quotes) ? quotes : [quotes];
    for (const q of list) {
      const item = q as any;
      if (item.symbol && item.regularMarketPrice != null) {
        const cleanSymbol = (item.symbol as string).replace('.JK', '');
        result[cleanSymbol] = item.regularMarketPrice;
      }
    }
    res.json(result);
  } catch (err: any) {
    console.error('Yahoo Finance batch error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil harga' });
  }
}
