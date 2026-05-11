-- CreateTable
CREATE TABLE "PdfDownload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PdfDownload_userId_idx" ON "PdfDownload"("userId");

-- CreateIndex
CREATE INDEX "PdfDownload_downloadedAt_idx" ON "PdfDownload"("downloadedAt");

-- AddForeignKey
ALTER TABLE "PdfDownload" ADD CONSTRAINT "PdfDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
