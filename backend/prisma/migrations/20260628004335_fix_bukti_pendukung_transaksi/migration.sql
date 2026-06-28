/*
  Warnings:

  - You are about to drop the column `buktiPendukung` on the `Saham` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Saham" DROP COLUMN "buktiPendukung";

-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN     "buktiPendukung" TEXT;
