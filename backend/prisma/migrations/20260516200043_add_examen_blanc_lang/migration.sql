/*
  Warnings:

  - You are about to drop the column `questionIds` on the `ExamenBlanc` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExamenBlanc" DROP COLUMN "questionIds",
ADD COLUMN     "questionIdsAr" TEXT[],
ADD COLUMN     "questionIdsFr" TEXT[];

-- AlterTable
ALTER TABLE "ExamenBlancParticipant" ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'fr';
