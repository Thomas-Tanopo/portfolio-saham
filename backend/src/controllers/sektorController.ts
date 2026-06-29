import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const auditInclude = {
  createdBy: { select: { id: true, nama: true } },
  updatedBy: { select: { id: true, nama: true } },
  deletedBy: { select: { id: true, nama: true } },
};

export async function getSektors(req: Request, res: Response) {
  const showDeleted = req.query.showDeleted === 'true';
  const where: any = {};
  if (!showDeleted) where.deletedAt = null;
  const data = await prisma.sektor.findMany({ where, include: { saham: true, ...auditInclude }, orderBy: { id: 'desc' } });
  res.json(data);
}

export async function createSektor(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { kode, nama, deskripsi } = req.body;
  const data = await prisma.sektor.create({
    data: { kode, nama, deskripsi, createdById: authUser.id },
    include: auditInclude,
  });
  res.status(201).json(data);
}

export async function updateSektor(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { kode, nama, deskripsi } = req.body;
  const data = await prisma.sektor.update({
    where: { id: Number(id) },
    data: { kode, nama, deskripsi, updatedById: authUser.id },
    include: auditInclude,
  });
  res.json(data);
}

export async function deleteSektor(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  await prisma.sektor.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedById: authUser.id },
  });
  res.json({ message: 'Sektor deleted' });
}
