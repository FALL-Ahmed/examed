-- Activer Row-Level Security sur toutes les tables publiques
-- Prisma utilise le rôle postgres (superuser) qui bypasse RLS automatiquement
-- Ceci bloque uniquement l'accès direct via l'API REST Supabase avec la clé anon

ALTER TABLE "Theme"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubTheme"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favorite"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attempt"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAnswer"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupInvite"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrustedDevice"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminPushSubscription"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceVerification"     ENABLE ROW LEVEL SECURITY;