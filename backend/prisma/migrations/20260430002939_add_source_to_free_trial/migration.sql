-- AlterTable
ALTER TABLE "FreeTrialEvent" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'direct';

-- AlterTable
ALTER TABLE "FreeTrialLead" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'direct';
