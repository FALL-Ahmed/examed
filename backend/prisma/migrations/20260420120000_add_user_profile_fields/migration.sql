-- AlterTable
ALTER TABLE "User" ADD COLUMN "pseudo" TEXT,
ADD COLUMN "profession" TEXT,
ADD COLUMN "wilaya" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_pseudo_key" ON "User"("pseudo");
