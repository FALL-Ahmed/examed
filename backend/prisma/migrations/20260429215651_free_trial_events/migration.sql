-- CreateTable
CREATE TABLE "FreeTrialEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'fr',
    "questionN" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeTrialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FreeTrialEvent_theme_createdAt_idx" ON "FreeTrialEvent"("theme", "createdAt");

-- CreateIndex
CREATE INDEX "FreeTrialEvent_sessionId_idx" ON "FreeTrialEvent"("sessionId");
