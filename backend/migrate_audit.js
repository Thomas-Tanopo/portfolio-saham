const { execSync } = require('child_process');

const sqls = [
  // Role
  'ALTER TABLE "Role" ADD COLUMN "createdById" INTEGER;',
  'ALTER TABLE "Role" ADD COLUMN "updatedById" INTEGER;',
  'ALTER TABLE "Role" ADD COLUMN "deletedById" INTEGER;',
  'ALTER TABLE "Role" ADD COLUMN "deletedAt" TIMESTAMP(3);',
  'ALTER TABLE "Role" ADD CONSTRAINT "Role_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Role" ADD CONSTRAINT "Role_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Role" ADD CONSTRAINT "Role_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',

  // Sektor
  'ALTER TABLE "Sektor" ADD COLUMN "createdById" INTEGER;',
  'ALTER TABLE "Sektor" ADD COLUMN "updatedById" INTEGER;',
  'ALTER TABLE "Sektor" ADD COLUMN "deletedById" INTEGER;',
  'ALTER TABLE "Sektor" ADD COLUMN "deletedAt" TIMESTAMP(3);',
  'ALTER TABLE "Sektor" ADD CONSTRAINT "Sektor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Sektor" ADD CONSTRAINT "Sektor_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Sektor" ADD CONSTRAINT "Sektor_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',

  // Saham
  'ALTER TABLE "Saham" ADD COLUMN "createdById" INTEGER;',
  'ALTER TABLE "Saham" ADD COLUMN "updatedById" INTEGER;',
  'ALTER TABLE "Saham" ADD COLUMN "deletedById" INTEGER;',
  'ALTER TABLE "Saham" ADD COLUMN "deletedAt" TIMESTAMP(3);',
  'ALTER TABLE "Saham" ADD CONSTRAINT "Saham_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Saham" ADD CONSTRAINT "Saham_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Saham" ADD CONSTRAINT "Saham_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',

  // Transaksi
  'ALTER TABLE "Transaksi" ADD COLUMN "createdById" INTEGER;',
  'ALTER TABLE "Transaksi" ADD COLUMN "updatedById" INTEGER;',
  'ALTER TABLE "Transaksi" ADD COLUMN "deletedById" INTEGER;',
  'ALTER TABLE "Transaksi" ADD COLUMN "deletedAt" TIMESTAMP(3);',
  'ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',

  // User
  'ALTER TABLE "User" ADD COLUMN "updatedById" INTEGER;',
  'ALTER TABLE "User" ADD COLUMN "deletedById" INTEGER;',
  'ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);',
  'ALTER TABLE "User" ADD CONSTRAINT "User_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'ALTER TABLE "User" ADD CONSTRAINT "User_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
];

const sql = sqls.join(' ');
execSync('npx prisma db execute --schema prisma/schema.prisma --stdin', { input: sql, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
console.log('Migration applied');
