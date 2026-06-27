import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: { include: { permissions: true } } },
  });

  if (!user) {
    return res.status(401).json({ message: 'Username tidak ditemukan' });
  }

  if (user.status !== 'aktif') {
    return res.status(401).json({ message: 'Akun tidak aktif' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Password salah' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role.nama },
    JWT_SECRET,
    { expiresIn: '24h' },
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role.nama,
      permissions: user.role.permissions,
    },
  });
}

export async function me(req: Request, res: Response) {
  const authUser = (req as any).user;
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { role: { include: { permissions: true } } },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role.nama,
    permissions: user.role.permissions,
  });
}
