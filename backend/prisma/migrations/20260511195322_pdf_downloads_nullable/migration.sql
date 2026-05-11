-- AlterTable
ALTER TABLE "PdfDownload" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "source" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
