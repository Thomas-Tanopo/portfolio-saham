import prisma from './lib/prisma';

async function main() {
  const adminRole = await prisma.role.findUnique({ where: { nama: 'admin' } });
  if (!adminRole) {
    console.log('Admin role not found, please run seed.ts first');
    return;
  }

  const allModules = ['User', 'Sektor', 'Saham', 'Transaksi', 'Report', 'Approval', 'Role'];

  for (const modul of allModules) {
    const perms = { view: true, create: true, edit: true, delete: true, create_with_approval: true, create_without_approval: true };
    await prisma.rolePermission.upsert({
      where: { roleId_modul: { roleId: adminRole.id, modul } },
      update: perms,
      create: { roleId: adminRole.id, modul, ...perms },
    });
  }

  console.log('Admin permissions updated: full access all modules');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
