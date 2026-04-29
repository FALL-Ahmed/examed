-- CreateTable
CREATE TABLE "FreeTrialLead" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeTrialLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FreeTrialLead_createdAt_idx" ON "FreeTrialLead"("createdAt");
