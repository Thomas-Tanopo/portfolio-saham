import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

async function main() {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Seed Roles
  const adminRole = await prisma.role.upsert({
    where: { nama: 'admin' },
    update: {},
    create: { nama: 'admin', deskripsi: 'Administrator with full access' },
  });

  const requesterRole = await prisma.role.upsert({
    where: { nama: 'requester' },
    update: {},
    create: { nama: 'requester', deskripsi: 'Requester - can create and manage transactions' },
  });

  const approvalRole = await prisma.role.upsert({
    where: { nama: 'approval' },
    update: {},
    create: { nama: 'approval', deskripsi: 'Approval - can approve/reject transactions' },
  });

  // Seed Role Permissions
  const allModules = ['User', 'Sektor', 'Saham', 'Transaksi', 'Report', 'Approval', 'Role'];

  // admin: full access all modules
  for (const modul of allModules) {
    const perms = { view: true, create: true, edit: true, delete: true, create_with_approval: true, create_without_approval: true };
    await prisma.rolePermission.upsert({
      where: { roleId_modul: { roleId: adminRole.id, modul } },
      update: perms,
      create: { roleId: adminRole.id, modul, ...perms },
    });
  }

  // requester: view Saham/Sektor/Report, create_with_approval Transaksi
  for (const modul of allModules) {
    const perms: any = { roleId: requesterRole.id, modul, view: false, create: false, edit: false, delete: false, create_with_approval: false, create_without_approval: false };
    if (modul === 'Saham' || modul === 'Sektor' || modul === 'Report') {
      perms.view = true;
    }
    if (modul === 'Transaksi') {
      perms.view = true; perms.create = true; perms.edit = true; perms.create_with_approval = true;
    }
    await prisma.rolePermission.upsert({
      where: { roleId_modul: { roleId: requesterRole.id, modul } },
      update: perms,
      create: perms,
    });
  }

  // approval: view Transaksi/Saham/Sektor/Report/Approval
  for (const modul of allModules) {
    const perms: any = { roleId: approvalRole.id, modul, view: false, create: false, edit: false, delete: false, create_with_approval: false, create_without_approval: false };
    if (['Saham', 'Sektor', 'Report', 'Approval'].includes(modul)) {
      perms.view = true;
    }
    if (modul === 'Transaksi') {
      perms.view = true; perms.edit = true;
    }
    await prisma.rolePermission.upsert({
      where: { roleId_modul: { roleId: approvalRole.id, modul } },
      update: perms,
      create: perms,
    });
  }

  // Seed Users with hashed passwords (all passwords: 123456)
  const users = [
    { username: 'admin', nama: 'Administrator', password: hash('123456'), roleId: adminRole.id, status: 'aktif' },
    { username: 'requester1', nama: 'Requester Satu', password: hash('123456'), roleId: requesterRole.id, status: 'aktif' },
    { username: 'requester2', nama: 'Requester Dua', password: hash('123456'), roleId: requesterRole.id, status: 'aktif' },
    { username: 'requester3', nama: 'Requester Tiga', password: hash('123456'), roleId: requesterRole.id, status: 'aktif' },
    { username: 'requester4', nama: 'Requester Empat', password: hash('123456'), roleId: requesterRole.id, status: 'aktif' },
    { username: 'requester5', nama: 'Requester Lima', password: hash('123456'), roleId: requesterRole.id, status: 'aktif' },
    { username: 'approval1', nama: 'Approval Satu', password: hash('123456'), roleId: approvalRole.id, status: 'aktif' },
    { username: 'approval2', nama: 'Approval Dua', password: hash('123456'), roleId: approvalRole.id, status: 'aktif' },
    { username: 'approval3', nama: 'Approval Tiga', password: hash('123456'), roleId: approvalRole.id, status: 'aktif' },
    { username: 'approval4', nama: 'Approval Empat', password: hash('123456'), roleId: approvalRole.id, status: 'aktif' },
    { username: 'approval5', nama: 'Approval Lima', password: hash('123456'), roleId: approvalRole.id, status: 'aktif' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { password: u.password, nama: u.nama },
      create: u,
    });
  }

  // Seed Sektors
  const sektorData = [
    { kode: 'FIN', nama: 'Financial', deskripsi: 'Perusahaan sektor keuangan dan perbankan' },
    { kode: 'TEC', nama: 'Technology', deskripsi: 'Perusahaan sektor teknologi dan informasi' },
    { kode: 'INF', nama: 'Infrastructure', deskripsi: 'Perusahaan sektor infrastruktur dan telekomunikasi' },
    { kode: 'CNS', nama: 'Consumer Goods', deskripsi: 'Perusahaan sektor barang konsumsi' },
  ];
  for (const s of sektorData) {
    await prisma.sektor.upsert({
      where: { kode: s.kode },
      update: {},
      create: s,
    });
  }

  // Seed Sahams
  const sahamData = [
    { kode: 'BBRI', nama: 'Bank Rakyat Indonesia', sektorKode: 'FIN' },
    { kode: 'BBCA', nama: 'Bank Central Asia', sektorKode: 'FIN' },
    { kode: 'BBNI', nama: 'Bank Negara Indonesia', sektorKode: 'FIN' },
    { kode: 'BJTM', nama: 'Bank Jatim', sektorKode: 'FIN' },
    { kode: 'BMRI', nama: 'Bank Mandiri', sektorKode: 'FIN' },
    { kode: 'BRIS', nama: 'Bank Syariah Indonesia', sektorKode: 'FIN' },
    { kode: 'ARTO', nama: 'Bank Jago', sektorKode: 'FIN' },
    { kode: 'ICBP', nama: 'Indofood CBP Sukses Makmur', sektorKode: 'CNS' },
    { kode: 'INDF', nama: 'Indofood Sukses Makmur', sektorKode: 'CNS' },
    { kode: 'UNVR', nama: 'Unilever Indonesia', sektorKode: 'CNS' },
    { kode: 'GGRM', nama: 'Gudang Garam', sektorKode: 'CNS' },
    { kode: 'TLKM', nama: 'Telkom Indonesia', sektorKode: 'INF' },
    { kode: 'EXCL', nama: 'XL Axiata', sektorKode: 'INF' },
    { kode: 'TOWR', nama: 'Sarana Menara Nusantara', sektorKode: 'INF' },
    { kode: 'ASII', nama: 'Astra International', sektorKode: 'INF' },
    { kode: 'GOTO', nama: 'GoTo Gojek Tokopedia', sektorKode: 'TEC' },
    { kode: 'BUKA', nama: 'Bukalapak', sektorKode: 'TEC' },
  ];
  for (const s of sahamData) {
    const sektor = await prisma.sektor.findUnique({ where: { kode: s.sektorKode } });
    if (!sektor) continue;
    await prisma.saham.upsert({
      where: { kode: s.kode },
      update: {},
      create: { kode: s.kode, nama: s.nama, sektorId: sektor.id },
    });
  }

  // Seed sample transactions for admin
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (adminUser) {
    const sahamMap = new Map((await prisma.saham.findMany()).map((s) => [s.kode, s.id]));
    const txData = [
      { sahamKode: 'BBRI', tipe: 'beli', jumlah: 10, harga: 4500, tanggal: new Date('2026-01-15') },
      { sahamKode: 'BBCA', tipe: 'beli', jumlah: 5, harga: 9250, tanggal: new Date('2026-01-20') },
      { sahamKode: 'TLKM', tipe: 'beli', jumlah: 20, harga: 3800, tanggal: new Date('2026-02-01') },
      { sahamKode: 'ICBP', tipe: 'beli', jumlah: 8, harga: 10250, tanggal: new Date('2026-02-10') },
      { sahamKode: 'ASII', tipe: 'beli', jumlah: 15, harga: 5500, tanggal: new Date('2026-03-01') },
      { sahamKode: 'BMRI', tipe: 'beli', jumlah: 12, harga: 6100, tanggal: new Date('2026-03-15') },
      { sahamKode: 'GOTO', tipe: 'beli', jumlah: 50, harga: 850, tanggal: new Date('2026-04-01') },
      { sahamKode: 'BBRI', tipe: 'jual', jumlah: 3, harga: 5100, tanggal: new Date('2026-04-10') },
      { sahamKode: 'TLKM', tipe: 'jual', jumlah: 5, harga: 3950, tanggal: new Date('2026-05-01') },
      { sahamKode: 'UNVR', tipe: 'beli', jumlah: 6, harga: 7800, tanggal: new Date('2026-05-15') },
    ];
    for (const tx of txData) {
      const sahamId = sahamMap.get(tx.sahamKode);
      if (!sahamId) continue;
      await prisma.transaksi.create({
        data: {
          userId: adminUser.id,
          sahamId,
          tipe: tx.tipe,
          jumlah: tx.jumlah,
          harga: tx.harga,
          tanggal: tx.tanggal,
          createdById: adminUser.id,
        },
      });
    }
  }

  console.log('Seed data berhasil');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
