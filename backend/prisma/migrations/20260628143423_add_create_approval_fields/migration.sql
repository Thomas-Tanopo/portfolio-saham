-- DropForeignKey
ALTER TABLE "ApprovalMatrix" DROP CONSTRAINT "ApprovalMatrix_groupId_fkey";

-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN     "create_with_approval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "create_without_approval" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "ApprovalMatrix" ADD CONSTRAINT "ApprovalMatrix_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ApprovalMatrixGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
