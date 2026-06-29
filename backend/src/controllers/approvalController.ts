import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getPendingApprovals(req: Request, res: Response) {
  const authUser = (req as any).user;

  const userLevels = await prisma.approvalMatrix.findMany({
    where: { userId: authUser.id, status: 'aktif', deletedAt: null },
    select: { releaseLevel: true },
  });
  const levelIds = userLevels.map((l) => l.releaseLevel);
  if (levelIds.length === 0) return res.json([]);

  const approvals = await prisma.transaksiApproval.findMany({
    where: {
      status: 'pending',
      releaseLevel: { in: levelIds },
      transaksi: { status: 'pending' },
      NOT: { processedByUserIds: { has: authUser.id } },
    },
    include: {
      transaksi: {
        include: {
          saham: true,
          user: { select: { id: true, nama: true } },
          createdBy: { select: { id: true, nama: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(approvals);
}

export async function processApproval(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { transaksiId } = req.params;
  const { action, catatan } = req.body;

  if (!['approved', 'rejected', 'request_info'].includes(action)) {
    return res.status(400).json({ message: 'Action tidak valid' });
  }

  const transaksi = await prisma.transaksi.findUnique({
    where: { id: Number(transaksiId) },
  });
  if (!transaksi) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  if (transaksi.status !== 'pending') return res.status(400).json({ message: 'Transaksi tidak dalam status pending' });

  const userLevels = await prisma.approvalMatrix.findMany({
    where: { userId: authUser.id, status: 'aktif', deletedAt: null },
    select: { releaseLevel: true, tipe: true, groupId: true },
  });
  const levelIds = userLevels.map((l) => l.releaseLevel);

  const currentApproval = await prisma.transaksiApproval.findFirst({
    where: {
      transaksiId: Number(transaksiId),
      status: 'pending',
      releaseLevel: { in: levelIds },
      NOT: { processedByUserIds: { has: authUser.id } },
    },
  });
  if (!currentApproval) return res.status(400).json({ message: 'Tidak ada approval pending untuk anda' });

  const userLevelInfo = userLevels.find((l) => l.releaseLevel === currentApproval.releaseLevel);

  if (action === 'request_info') {
    await prisma.transaksiApproval.update({
      where: { id: currentApproval.id },
      data: { status: 'request_info', catatan, processedById: authUser.id, processedAt: new Date() },
    });
    await prisma.transaksi.update({
      where: { id: Number(transaksiId) },
      data: { status: 'request_info' },
    });
    return res.json({ message: 'Request info berhasil dikirim' });
  }

  if (action === 'rejected') {
    await prisma.transaksiApproval.update({
      where: { id: currentApproval.id },
      data: { status: 'rejected', catatan, processedById: authUser.id, processedAt: new Date() },
    });
    await prisma.transaksi.update({
      where: { id: Number(transaksiId) },
      data: { status: 'rejected' },
    });
    return res.json({ message: 'Transaksi ditolak' });
  }

  if (action === 'approved') {
    const tipe = userLevelInfo?.tipe || 'or';

    if (tipe === 'and') {
      await prisma.transaksiApproval.update({
        where: { id: currentApproval.id },
        data: {
          processedByUserIds: { push: authUser.id },
          processedById: authUser.id,
          processedAt: new Date(),
        },
      });

      const updated = await prisma.transaksiApproval.findUnique({
        where: { id: currentApproval.id },
      });

      const totalUsers = await prisma.approvalMatrix.count({
        where: {
          releaseLevel: currentApproval.releaseLevel,
          groupId: userLevelInfo!.groupId,
          status: 'aktif',
          deletedAt: null,
        },
      });

      if ((updated?.processedByUserIds.length || 0) < totalUsers) {
        return res.json({ message: 'Approved, menunggu approver lain di level yang sama' });
      }

      await prisma.transaksiApproval.update({
        where: { id: currentApproval.id },
        data: { status: 'approved' },
      });
    } else {
      await prisma.transaksiApproval.update({
        where: { id: currentApproval.id },
        data: { status: 'approved', catatan, processedById: authUser.id, processedAt: new Date() },
      });
    }

    const currentGroups = await prisma.approvalMatrix.findMany({
      where: { releaseLevel: currentApproval.releaseLevel, status: 'aktif', deletedAt: null },
      select: { groupId: true },
      distinct: ['groupId'],
    });
    const groupIds = currentGroups.map((g) => g.groupId);
    const nextLevel = groupIds.length > 0 ? await prisma.approvalMatrix.findFirst({
      where: { releaseLevel: { gt: currentApproval.releaseLevel }, groupId: { in: groupIds }, status: 'aktif', deletedAt: null },
      orderBy: { releaseLevel: 'asc' },
    }) : null;

    if (nextLevel) {
      await prisma.transaksiApproval.create({
        data: { transaksiId: Number(transaksiId), releaseLevel: nextLevel.releaseLevel, status: 'pending' },
      });
      return res.json({ message: 'Approved, lanjut ke level berikutnya' });
    }

    await prisma.transaksi.update({
      where: { id: Number(transaksiId) },
      data: { status: 'approved' },
    });
    return res.json({ message: 'Transaksi disetujui' });
  }
}
