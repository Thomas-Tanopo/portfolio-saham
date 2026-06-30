import { Request, Response } from 'express';
import prisma from '../lib/prisma';

async function getCurrentHoldings(userId: number, sahamId: number, excludeTxId?: number): Promise<number> {
  const where: any = { userId, sahamId, status: 'approved' };
  if (excludeTxId) where.id = { not: excludeTxId };
  const transaksis = await prisma.transaksi.findMany({ where, select: { tipe: true, jumlah: true } });
  let lembar = 0;
  for (const tx of transaksis) {
    if (tx.tipe === 'beli') lembar += tx.jumlah;
    else if (tx.tipe === 'jual') lembar -= tx.jumlah;
  }
  return lembar;
}

const auditInclude = {
  createdBy: { select: { id: true, nama: true } },
  updatedBy: { select: { id: true, nama: true } },
  deletedBy: { select: { id: true, nama: true } },
};

export async function getTransaksis(req: Request, res: Response) {
  const showDeleted = req.query.showDeleted === 'true';
  const where: any = {};
  if (!showDeleted) where.deletedAt = null;
  const data = await prisma.transaksi.findMany({
    where,
    include: { saham: true, user: true, approval: true, ...auditInclude },
    orderBy: { id: 'desc' },
  });
  res.json(data);
}

export async function createTransaksi(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { userId, sahamId, tipe, jumlah, harga, tanggal, buktiPendukung, remarks } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { role: { include: { permissions: { where: { modul: 'Transaksi' } } } } },
  });
  const perm = user?.role?.permissions?.[0];
  const withApproval = perm?.create_with_approval ?? false;
  const withoutApproval = perm?.create_without_approval ?? false;

  if (!withApproval && !withoutApproval) {
    return res.status(403).json({ message: 'Anda tidak memiliki izin membuat transaksi' });
  }

  let requesterMatrix: any = null;
  if (withApproval) {
    requesterMatrix = await prisma.approvalMatrix.findFirst({
      where: { userId: authUser.id, releaseLevel: 0, status: 'aktif', deletedAt: null },
    });
    if (!requesterMatrix) {
      return res.status(400).json({ message: 'Anda belum dimaintain sebagai requester di approval matrix (level 0)' });
    }
    const headApproval = await prisma.approvalMatrix.findFirst({
      where: { releaseLevel: 1, groupId: requesterMatrix.groupId, status: 'aktif', deletedAt: null },
    });
    if (!headApproval) {
      return res.status(400).json({ message: 'Maintain release level 1 (head approval) terlebih dahulu' });
    }
  }

  if (tipe === 'jual') {
    const currentLembar = await getCurrentHoldings(authUser.id, sahamId);
    if (jumlah > currentLembar) {
      return res.status(400).json({ message: `Saldo saham tidak mencukupi. Tersedia: ${currentLembar} lembar` });
    }
  }

  const data = await prisma.transaksi.create({
    data: {
      userId, sahamId, tipe, jumlah, harga,
      tanggal: tanggal ? new Date(tanggal) : undefined,
      buktiPendukung, remarks,
      status: withApproval ? 'pending' : 'approved',
      createdById: authUser.id,
    },
    include: { saham: true, user: true, approval: true, ...auditInclude },
  });

  if (withApproval) {
    const groupId = requesterMatrix?.groupId;
    const firstLevel = groupId ? await prisma.approvalMatrix.findFirst({
      where: { releaseLevel: { gt: 0 }, groupId, status: 'aktif', deletedAt: null },
      orderBy: { releaseLevel: 'asc' },
    }) : null;
    if (firstLevel) {
      await prisma.transaksiApproval.create({
        data: { transaksiId: data.id, releaseLevel: firstLevel.releaseLevel, status: 'pending' },
      });
    }
  }

  res.status(201).json(data);
}

export async function updateTransaksi(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { userId, sahamId, tipe, jumlah, harga, tanggal, buktiPendukung, remarks } = req.body;

  const existing = await prisma.transaksi.findUnique({ where: { id: Number(id) } });
  if (!existing) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

  if (tipe === 'jual') {
    const currentLembar = await getCurrentHoldings(authUser.id, sahamId || existing.sahamId, Number(id));
    if (jumlah > currentLembar) {
      return res.status(400).json({ message: `Saldo saham tidak mencukupi. Tersedia: ${currentLembar} lembar` });
    }
  }

  const data = await prisma.transaksi.update({
    where: { id: Number(id) },
    data: {
      userId, sahamId, tipe, jumlah, harga,
      tanggal: tanggal ? new Date(tanggal) : undefined,
      buktiPendukung, remarks,
      updatedById: authUser.id,
    },
    include: { saham: true, user: true, approval: true, ...auditInclude },
  });

  res.json(data);
}

export async function resubmitTransaksi(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { userId, sahamId, tipe, jumlah, harga, tanggal, buktiPendukung, remarks } = req.body;

  const existing = await prisma.transaksi.findUnique({ where: { id: Number(id) } });
  if (!existing) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  if (existing.status !== 'request_info') return res.status(400).json({ message: 'Status bukan request_info' });
  if (existing.createdById !== authUser.id) return res.status(403).json({ message: 'Hanya pembuat yang bisa resubmit' });

  if (tipe === 'jual') {
    const currentLembar = await getCurrentHoldings(authUser.id, sahamId || existing.sahamId, Number(id));
    if (jumlah > currentLembar) {
      return res.status(400).json({ message: `Saldo saham tidak mencukupi. Tersedia: ${currentLembar} lembar` });
    }
  }

  await prisma.transaksiApproval.updateMany({
    where: { transaksiId: Number(id) },
    data: { status: 'cancelled', processedAt: new Date() },
  });

  const data = await prisma.transaksi.update({
    where: { id: Number(id) },
    data: {
      userId, sahamId, tipe, jumlah, harga,
      tanggal: tanggal ? new Date(tanggal) : undefined,
      buktiPendukung, remarks,
      status: 'pending',
      updatedById: authUser.id,
    },
    include: { saham: true, user: true, ...auditInclude },
  });

  const requesterGroup = await prisma.approvalMatrix.findFirst({
    where: { userId: authUser.id, releaseLevel: 0, status: 'aktif', deletedAt: null },
    select: { groupId: true },
  });
  const firstLevel = requesterGroup ? await prisma.approvalMatrix.findFirst({
    where: { releaseLevel: { gt: 0 }, groupId: requesterGroup.groupId, status: 'aktif', deletedAt: null },
    orderBy: { releaseLevel: 'asc' },
  }) : null;
  if (firstLevel) {
    await prisma.transaksiApproval.create({
      data: { transaksiId: data.id, releaseLevel: firstLevel.releaseLevel, status: 'pending' },
    });
  }

  res.json(data);
}

export async function getActivityLog(req: Request, res: Response) {
  const { id } = req.params;
  const numericId = Number(id);

  const transaksi = await prisma.transaksi.findUnique({
    where: { id: numericId },
    select: {
      id: true,
      tanggal: true,
      status: true,
      createdById: true,
      createdBy: { select: { id: true, nama: true } },
      updatedById: true,
      updatedBy: { select: { id: true, nama: true } },
      updatedAt: true,
      deletedById: true,
      deletedBy: { select: { id: true, nama: true } },
      deletedAt: true,
      approval: { orderBy: [{ releaseLevel: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  if (!transaksi) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

  const events: any[] = [];

  events.push({
    type: 'created',
    timestamp: transaksi.tanggal,
    user: transaksi.createdBy,
    description: 'Transaksi dibuat',
  });

  if (transaksi.updatedById) {
    events.push({
      type: 'updated',
      timestamp: transaksi.updatedAt || transaksi.tanggal,
      user: transaksi.updatedBy,
      description: 'Transaksi diedit',
    });
  }

  if (transaksi.deletedById) {
    events.push({
      type: 'deleted',
      timestamp: transaksi.deletedAt || transaksi.tanggal,
      user: transaksi.deletedBy,
      description: 'Transaksi dihapus',
    });
  }

  for (const approval of transaksi.approval) {
    const matrixUsers = await prisma.approvalMatrix.findMany({
      where: { releaseLevel: approval.releaseLevel, status: 'aktif', deletedAt: null },
      include: { user: { select: { id: true, nama: true } } },
    });
    const allUsers = matrixUsers.map((m) => m.user);
    const pendingUsers = allUsers.filter((u) => !approval.processedByUserIds.includes(u.id));

    if (approval.status === 'cancelled') {
      events.push({
        type: 'cancelled',
        timestamp: approval.processedAt || approval.createdAt,
        level: approval.releaseLevel,
        description: `Level ${approval.releaseLevel} dibatalkan (resubmit)`,
      });
      continue;
    }

    if (approval.status === 'pending') {
      events.push({
        type: 'pending',
        timestamp: approval.createdAt,
        level: approval.releaseLevel,
        users: allUsers,
        pendingUsers,
        description: `Menunggu approval level ${approval.releaseLevel}`,
      });
      continue;
    }

    let processedUsers: { id: number; nama: string }[] = [];
    if (approval.processedByUserIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: approval.processedByUserIds } },
        select: { id: true, nama: true },
      });
      processedUsers = users;
    }

    events.push({
      type: approval.status,
      timestamp: approval.processedAt || approval.createdAt,
      level: approval.releaseLevel,
      users: processedUsers,
      catatan: approval.catatan,
      description:
        approval.status === 'approved'
          ? `Level ${approval.releaseLevel} disetujui`
          : approval.status === 'rejected'
          ? `Level ${approval.releaseLevel} ditolak`
          : `Level ${approval.releaseLevel} diminta info`,
    });
  }

  if (transaksi.status === 'rejected') {
    events.push({
      type: 'rejected',
      timestamp: transaksi.updatedAt || transaksi.tanggal,
      description: 'Transaksi ditolak',
    });
  }

  if (transaksi.status === 'request_info') {
    events.push({
      type: 'request_info',
      timestamp: transaksi.updatedAt || transaksi.tanggal,
      description: 'Menunggu perbaikan dari requester',
    });
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json(events);
}

export async function deleteTransaksi(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  await prisma.transaksi.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedById: authUser.id },
  });
  res.json({ message: 'Transaksi deleted' });
}
