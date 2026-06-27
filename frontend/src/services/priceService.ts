import api from './api';

export async function fetchSemuaHarga(kodes: string[]): Promise<Record<string, number>> {
  if (kodes.length === 0) return {};
  const res = await api.post('/harga/batch', { kodes });
  return res.data;
}
