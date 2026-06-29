import prisma from '../../src/lib/prisma';

async function main() {
  const transaksiPerms = await prisma.rolePermission.findMany({
    where: { modul: 'Transaksi', create: true },
  });
  for (const perm of transaksiPerms) {
    await prisma.rolePermission.update({
      where: { id: perm.id },
      data: { create_without_approval: true },
    });
  }
  console.log(`Updated ${transaksiPerms.length} Transaksi permissions to create_without_approval`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
