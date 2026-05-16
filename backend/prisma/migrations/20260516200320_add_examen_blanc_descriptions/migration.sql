/*
  Warnings:

  - You are about to drop the column `description` on the `ExamenBlanc` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExamenBlanc" DROP COLUMN "description",
ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "descriptionFr" TEXT;
