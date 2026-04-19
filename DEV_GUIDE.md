# ExaMed — Guide de démarrage rapide

## Démarrage rapide (Docker)

```bash
# 1. Cloner / se placer dans le dossier
cd infirmier

# 2. Lancer tout avec le script
bash start.sh
```

## Développement local (sans Docker)

### Prérequis
- Node.js 20+
- Python 3.11+
- PostgreSQL 15
- Redis

### Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev
```

### PDF Parser
```bash
cd pdf-parser
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Accès

| Service     | URL                              |
|-------------|----------------------------------|
| Application | http://localhost:3000            |
| API Backend | http://localhost:3001            |
| API Docs    | http://localhost:3001/api/docs   |
| PDF Parser  | http://localhost:8000            |

## Compte Admin par défaut

- **Email** : admin@examed.mr
- **MDP** : Admin@ExaMed2024!

> ⚠️ Changer en production !

## Flux d'utilisation

### 1. Importer votre PDF
1. Connectez-vous en tant qu'admin
2. Allez dans **Admin → Importer PDF**
3. Glissez votre PDF
4. Cliquez "Analyser" pour prévisualiser
5. Confirmez l'import

### 2. Valider un paiement
1. L'étudiant envoie son code Mobile Money
2. Allez dans **Admin → Paiements**
3. Cliquez "Valider" → compte passe en PREMIUM

### 3. Sécurité comptes

- Max **2 appareils** simultanément par compte
- Si dépassement → le plus ancien appareil est déconnecté
- Refresh token à usage unique (rotation)
- Rate limiting: 100 req/min par utilisateur

## Variables d'environnement importantes

**backend/.env**
```
JWT_SECRET=         # Changer en production !
JWT_REFRESH_SECRET= # Changer en production !
PDF_PARSER_URL=     # URL du microservice Python
```

## Adapter le parser PDF

Si la structure de votre PDF est différente, modifier les **REGEX** dans :
```
pdf-parser/main.py → lignes THEME_PATTERNS, SUBTHEME_PATTERNS, QUESTION_PATTERNS, etc.
```

## Numéro Mobile Money

Modifier dans :
```
frontend/src/app/(dashboard)/payment/page.tsx → MOBILE_MONEY_NUMBER
```
