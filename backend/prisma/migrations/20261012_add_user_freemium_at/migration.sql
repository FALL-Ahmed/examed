-- Suivi de conversion freemium → Premium
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "freemiumAt" TIMESTAMP(3);
UPDATE "User" SET "freemiumAt" = "createdAt" WHERE "role" = 'FREEMIUM' AND "freemiumAt" IS NULL;
