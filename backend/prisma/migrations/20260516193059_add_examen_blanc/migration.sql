-- CreateTable
CREATE TABLE "ExamenBlanc" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Examen Blanc National',
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "resultsAt" TIMESTAMP(3) NOT NULL,
    "questionIds" TEXT[],
    "totalQ" INTEGER NOT NULL DEFAULT 80,
    "durationMin" INTEGER NOT NULL DEFAULT 120,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamenBlanc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamenBlancParticipant" (
    "id" TEXT NOT NULL,
    "examenBlancId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "rawScore" DOUBLE PRECISION,
    "classement" INTEGER,
    "timeTaken" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "tricherie" BOOLEAN NOT NULL DEFAULT false,
    "tabSwitches" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamenBlancParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamenBlancReponse" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "partialScore" DOUBLE PRECISION NOT NULL,
    "tempsReponse" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamenBlancReponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamenBlancParticipant_sessionId_key" ON "ExamenBlancParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "ExamenBlancParticipant_examenBlancId_idx" ON "ExamenBlancParticipant"("examenBlancId");

-- CreateIndex
CREATE INDEX "ExamenBlancParticipant_telephone_idx" ON "ExamenBlancParticipant"("telephone");

-- CreateIndex
CREATE INDEX "ExamenBlancReponse_participantId_idx" ON "ExamenBlancReponse"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamenBlancReponse_participantId_questionId_key" ON "ExamenBlancReponse"("participantId", "questionId");

-- AddForeignKey
ALTER TABLE "ExamenBlancParticipant" ADD CONSTRAINT "ExamenBlancParticipant_examenBlancId_fkey" FOREIGN KEY ("examenBlancId") REFERENCES "ExamenBlanc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamenBlancReponse" ADD CONSTRAINT "ExamenBlancReponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ExamenBlancParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
