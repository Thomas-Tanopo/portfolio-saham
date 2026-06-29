-- Add processedByUserIds array column for tracking multi-user AND approvals
ALTER TABLE "TransaksiApproval" ADD COLUMN "processedByUserIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[] NOT NULL;
