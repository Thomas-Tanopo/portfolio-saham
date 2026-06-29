import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const auditInclude = {
  createdBy: { select: { id: true, nama: true } },
  updatedBy: { select: { id: true, nama: true } },
  deletedBy: { select: { id: true, nama: true } },
};

export async function getRoles(req: Request, res: Response) {
  const showDeleted = req.query.showDeleted === 'true';
  const where: any = {};
  if (!showDeleted) where.deletedAt = null;
  const data = await prisma.role.findMany({ where, include: { permissions: true, ...auditInclude }, orderBy: { id: 'desc' } });
  res.json(data);
}

export async function getRole(req: Request, res: Response) {
  const { id } = req.params;
  const data = await prisma.role.findUnique({ where: { id: Number(id) }, include: { permissions: true, ...auditInclude } });
  if (!data) return res.status(404).json({ message: 'Role not found' });
  res.json(data);
}

export async function createRole(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { nama, deskripsi, permissions } = req.body;
  const data = await prisma.role.create({
    data: {
      nama,
      deskripsi,
      createdById: authUser.id,
      permissions: {
        create: permissions.map((p: any) => ({
          modul: p.modul, view: p.view, edit: p.edit, delete: p.delete,
          create: p.create_with_approval || p.create_without_approval || p.create,
          create_with_approval: p.create_with_approval ?? false,
          create_without_approval: p.create_without_approval ?? false,
        })),
      },
    },
    include: { permissions: true, ...auditInclude },
  });
  res.status(201).json(data);
}

export async function updateRole(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const { nama, deskripsi, permissions } = req.body;

  await prisma.rolePermission.deleteMany({ where: { roleId: Number(id) } });

  const data = await prisma.role.update({
    where: { id: Number(id) },
    data: {
      nama,
      deskripsi,
      updatedById: authUser.id,
      permissions: {
        create: permissions.map((p: any) => ({
          modul: p.modul, view: p.view, edit: p.edit, delete: p.delete,
          create: p.create_with_approval || p.create_without_approval || p.create,
          create_with_approval: p.create_with_approval ?? false,
          create_without_approval: p.create_without_approval ?? false,
        })),
      },
    },
    include: { permissions: true, ...auditInclude },
  });
  res.json(data);
}

export async function deleteRole(req: Request, res: Response) {
  const authUser = (req as any).user;
  const { id } = req.params;
  const usersCount = await prisma.user.count({ where: { roleId: Number(id), deletedAt: null } });
  if (usersCount > 0) {
    return res.status(400).json({ message: 'Role tidak dapat dihapus karena masih digunakan oleh user' });
  }
  await prisma.role.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedById: authUser.id },
  });
  res.json({ message: 'Role deleted' });
}
