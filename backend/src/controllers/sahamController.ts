import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const auditInclude = {
  createdBy: { select: { id: true, nama: true } },
  updatedBy: { select: { id: true, nama: true } },
  deletedBy: { select: { id: true, nama: true } },
};

export async function getSahams(req: Request, res: Response) {
  const showDeleted = req.query.showDeleted === 'true';
  const where: any = {};
  if (!showDeleted) where.deletedAt = null;
  const data = await prisma.saham.findMany({ where, include: { sektor: true, ...auditInclude }, orderBy: { id: 'asc' } });
  res.json(data);
}

export async function getSaham(req: Request, res: Response) {
  const { id } = req.params;
  const data = await prisma.saham.findUnique({ where: { id: Number(id) }, include: { sektor: true, ...auditInclude } });
  if (!data) return res.status(404).json({ message: 'Saham not found' });
  res.json(data);
}

export async function createSaham(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { kode, nama, sektorId } = req.body;
  const data = await prisma.saham.create({
    data: { kode, nama, sektorId, createdById: authUser.id },
    include: { sektor: true, ...auditInclude },
  });
  res.status(201).json(data);
}

export async function updateSaham(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { kode, nama, sektorId, dividendPerShare } = req.body;
  const data = await prisma.saham.update({
    where: { id: Number(id) },
    data: { kode, nama, sektorId, dividendPerShare, updatedById: authUser.id },
    include: { sektor: true, ...auditInclude },
  });
  res.json(data);
}

export async function patchDividend(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { dividendPerShare } = req.body;
  if (dividendPerShare == null) {
    return res.status(400).json({ message: 'dividendPerShare wajib diisi' });
  }
  const data = await prisma.saham.update({
    where: { id: Number(id) },
    data: { dividendPerShare, updatedById: authUser.id },
  });
  res.json(data);
}

export async function deleteSaham(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  await prisma.saham.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedById: authUser.id },
  });
  res.json({ message: 'Saham deleted' });
}
