import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const auditInclude = {
  updatedBy: { select: { id: true, nama: true } },
  deletedBy: { select: { id: true, nama: true } },
};

export async function getUsers(req: Request, res: Response) {
  const showDeleted = req.query.showDeleted === 'true';
  const where: any = {};
  if (!showDeleted) where.deletedAt = null;
  const data = await prisma.user.findMany({ where, include: { role: true, ...auditInclude } });
  res.json(data);
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const data = await prisma.user.findUnique({ where: { id: Number(id) }, include: { role: true, ...auditInclude } });
  if (!data) return res.status(404).json({ message: 'User not found' });
  res.json(data);
}

export async function createUser(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { username, nama, password, roleId, status } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const data = await prisma.user.create({
    data: { username, nama, password: hashed, roleId: roleId || 2, status: status || 'aktif' },
    include: { role: true, ...auditInclude },
  });
  res.status(201).json(data);
}

export async function updateUser(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { username, nama, password, roleId, status } = req.body;
  const updateData: any = { username, nama, roleId, status, updatedById: authUser.id };
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }
  const data = await prisma.user.update({
    where: { id: Number(id) },
    data: updateData,
    include: { role: true, ...auditInclude },
  });
  res.json(data);
}

export async function deleteUser(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  await prisma.user.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedById: authUser.id },
  });
  res.json({ message: 'User deleted' });
}
