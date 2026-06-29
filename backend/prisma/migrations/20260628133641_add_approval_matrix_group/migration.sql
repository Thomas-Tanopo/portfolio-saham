-- AlterTable
ALTER TABLE "ApprovalMatrix" ADD COLUMN     "groupId" INTEGER;

-- CreateTable
CREATE TABLE "ApprovalMatrixGroup" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "deletedById" INTEGER,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalMatrixGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalMatrixGroup_code_key" ON "ApprovalMatrixGroup"("code");

-- AddForeignKey
ALTER TABLE "ApprovalMatrixGroup" ADD CONSTRAINT "ApprovalMatrixGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalMatrixGroup" ADD CONSTRAINT "ApprovalMatrixGroup_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalMatrixGroup" ADD CONSTRAINT "ApprovalMatrixGroup_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalMatrix" ADD CONSTRAINT "ApprovalMatrix_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ApprovalMatrixGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
