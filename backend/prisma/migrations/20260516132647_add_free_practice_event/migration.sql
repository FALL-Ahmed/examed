-- CreateTable
CREATE TABLE "FreePracticeEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "themeId" TEXT,
    "themeName" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'fr',
    "eventType" TEXT NOT NULL,
    "questionN" INTEGER,
    "isCorrect" BOOLEAN,
    "count" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreePracticeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FreePracticeEvent_themeName_createdAt_idx" ON "FreePracticeEvent"("themeName", "createdAt");

-- CreateIndex
CREATE INDEX "FreePracticeEvent_sessionId_idx" ON "FreePracticeEvent"("sessionId");
