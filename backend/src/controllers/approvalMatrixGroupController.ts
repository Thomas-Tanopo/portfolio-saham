import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getApprovalMatrixGroups(req: Request, res: Response) {
  const data = await prisma.approvalMatrixGroup.findMany({
    where: { deletedAt: null },
    include: {
      items: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, nama: true, username: true } } },
        orderBy: [{ releaseLevel: 'asc' }, { userId: 'asc' }],
      },
    },
    orderBy: { id: 'desc' },
  });
  res.json(data);
}

export async function createApprovalMatrixGroup(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { code, nama, status } = req.body;
  const data = await prisma.approvalMatrixGroup.create({
    data: { code, nama, status: status || 'aktif', createdById: authUser.id },
  });
  res.status(201).json(data);
}

export async function updateApprovalMatrixGroup(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { code, nama, status } = req.body;
  const data = await prisma.approvalMatrixGroup.update({
    where: { id: Number(id) },
    data: { code, nama, status, updatedById: authUser.id },
  });
  res.json(data);
}

export async function deleteApprovalMatrixGroup(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  await prisma.approvalMatrix.updateMany({
    where: { groupId: Number(id), deletedAt: null },
    data: { deletedById: authUser.id, deletedAt: new Date() },
  });
  await prisma.approvalMatrixGroup.update({
    where: { id: Number(id) },
    data: { deletedById: authUser.id, deletedAt: new Date() },
  });
  res.json({ message: 'Grup dan semua item berhasil dihapus' });
}
