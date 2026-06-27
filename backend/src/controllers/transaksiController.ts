import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const auditInclude = {
  createdBy: { select: { id: true, nama: true } },
  updatedBy: { select: { id: true, nama: true } },
};

export async function getTransaksis(req: Request, res: Response) {
  const data = await prisma.transaksi.findMany({
    include: { saham: true, user: true, ...auditInclude },
    orderBy: { tanggal: 'desc' },
  });
  res.json(data);
}

export async function createTransaksi(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { userId, sahamId, tipe, jumlah, harga, tanggal } = req.body;
  const data = await prisma.transaksi.create({
    data: {
      userId, sahamId, tipe, jumlah, harga,
      tanggal: tanggal ? new Date(tanggal) : undefined,
      createdById: authUser.id,
    },
    include: { saham: true, user: true, ...auditInclude },
  });
  res.status(201).json(data);
}

export async function updateTransaksi(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { userId, sahamId, tipe, jumlah, harga, tanggal } = req.body;
  const data = await prisma.transaksi.update({
    where: { id: Number(id) },
    data: {
      userId, sahamId, tipe, jumlah, harga,
      tanggal: tanggal ? new Date(tanggal) : undefined,
      updatedById: authUser.id,
    },
    include: { saham: true, user: true, ...auditInclude },
  });
  res.json(data);
}

export async function deleteTransaksi(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.transaksi.delete({ where: { id: Number(id) } });
  res.json({ message: 'Transaksi deleted' });
}
