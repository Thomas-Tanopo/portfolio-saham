-- Make groupId NOT NULL
ALTER TABLE "ApprovalMatrix" ALTER COLUMN "groupId" SET NOT NULL;

-- Drop old index
DROP INDEX IF EXISTS "ApprovalMatrix_releaseLevel_userId_key";

-- Create new unique index
CREATE UNIQUE INDEX "ApprovalMatrix_groupId_releaseLevel_userId_key" ON "ApprovalMatrix"("groupId", "releaseLevel", "userId");
