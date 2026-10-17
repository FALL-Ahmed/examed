-- Traçabilité des inscriptions (anti-robots)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupIp" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupUserAgent" TEXT;
