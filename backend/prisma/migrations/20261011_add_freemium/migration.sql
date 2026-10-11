-- Essai gratuit (freemium) : nouveau rôle + sous-thèmes ouverts
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FREEMIUM';
ALTER TABLE "SubTheme" ADD COLUMN IF NOT EXISTS "isFreemium" BOOLEAN NOT NULL DEFAULT false;
