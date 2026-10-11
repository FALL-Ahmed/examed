-- Concours de la Rentrée : même moteur que l'Examen Blanc, distingué par "kind"
ALTER TABLE "ExamenBlanc" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'EXAMEN_BLANC';
ALTER TABLE "ExamenBlancParticipant" ADD COLUMN IF NOT EXISTS "prizeGranted" BOOLEAN NOT NULL DEFAULT false;
