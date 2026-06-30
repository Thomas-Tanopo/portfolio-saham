import { Request, Response } from 'express';
import prisma from '../lib/prisma';

async function validateUserPermission(userId: number, releaseLevel: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } } },
  });
  if (!user) return 'User tidak ditemukan';

  const perms = user.role.permissions;
  if (releaseLevel === 0) {
    const transaksiPerm = perms.find(p => p.modul === 'Transaksi');
    if (!transaksiPerm?.create_with_approval) return 'User harus memiliki role dengan centang "Create w/ Approval" pada modul Transaksi';
  } else {
    const approvalPerm = perms.find(p => p.modul === 'Approval');
    if (!approvalPerm?.view) return 'User harus memiliki role dengan akses View pada modul Approval';
  }
  return null;
}

export async function getApprovalMatrix(req: Request, res: Response) {
  const { groupId } = req.query;
  const showDeleted = req.query.showDeleted === 'true';
  const where: any = {};
  if (!showDeleted) where.deletedAt = null;
  if (groupId) where.groupId = Number(groupId);
  const data = await prisma.approvalMatrix.findMany({
    where,
    include: { user: { select: { id: true, nama: true, username: true } } },
    orderBy: [{ releaseLevel: 'asc' }, { userId: 'asc' }],
  });
  res.json(data);
}

export async function createApprovalMatrix(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { groupId, releaseLevel, userId, tipe, status } = req.body;
  if (!groupId) return res.status(400).json({ error: 'groupId wajib diisi' });

  const error = await validateUserPermission(userId, releaseLevel);
  if (error) return res.status(400).json({ error });

  const saveTipe = tipe || 'or';
  const data = await prisma.approvalMatrix.create({
    data: {
      groupId: Number(groupId), releaseLevel, userId, tipe: saveTipe, status: status || 'aktif',
      createdById: authUser.id,
    },
    include: { user: { select: { id: true, nama: true, username: true } } },
  });

  await prisma.approvalMatrix.updateMany({
    where: { groupId: Number(groupId), releaseLevel, id: { not: data.id }, deletedAt: null },
    data: { tipe: saveTipe },
  });

  res.status(201).json(data);
}

export async function updateApprovalMatrix(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { releaseLevel, userId, tipe, status } = req.body;

  const existing = await prisma.approvalMatrix.findUnique({ where: { id: Number(id) } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const targetUserId = userId ?? existing.userId;
  const targetLevel = releaseLevel ?? existing.releaseLevel;
  const error = await validateUserPermission(targetUserId, targetLevel);
  if (error) return res.status(400).json({ error });

  const dataUpdate: any = { updatedById: authUser.id };
  if (releaseLevel !== undefined) dataUpdate.releaseLevel = releaseLevel;
  if (userId !== undefined) dataUpdate.userId = userId;
  if (tipe !== undefined) dataUpdate.tipe = tipe;
  if (status !== undefined) dataUpdate.status = status;

  await prisma.approvalMatrix.update({
    where: { id: Number(id) },
    data: dataUpdate,
  });

  if (tipe !== undefined) {
    await prisma.approvalMatrix.updateMany({
      where: { groupId: existing.groupId, releaseLevel: targetLevel, id: { not: Number(id) }, deletedAt: null },
      data: { tipe },
    });
  }

  const data = await prisma.approvalMatrix.findUnique({
    where: { id: Number(id) },
    include: { user: { select: { id: true, nama: true, username: true } } },
  });
  res.json(data);
}

export async function deleteApprovalMatrix(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  await prisma.approvalMatrix.update({
    where: { id: Number(id) },
    data: { deletedById: authUser.id, deletedAt: new Date() },
  });
  await prisma.approvalMatrix.delete({ where: { id: Number(id) } });
  res.json({ message: 'Dihapus' });
}
