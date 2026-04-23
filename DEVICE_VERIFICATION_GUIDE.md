# 🔐 Système de Vérification de Device - Documentation

## Vue d'ensemble

Ce système empêche le partage de comptes PREMIUM en exigeant une vérification pour chaque nouvel appareil. Chaque utilisateur peut avoir maximum **2 appareils de confiance**.

---

## 🎯 Flux de fonctionnement

### 1️⃣ **Première connexion sur un nouvel appareil**

```
Utilisateur entre email/password
        ↓
Serveur génère fingerprint du device
        ↓
Est-ce un device connu? NON
        ↓
Créer code verification (6 chiffres)
        ↓
Envoyer email avec code
        ↓
Retourner: "requiresDeviceVerification: true"
```

**Réponse Backend:**
```json
{
  "requiresDeviceVerification": true,
  "message": "Un code de vérification a été envoyé à votre email",
  "deviceFingerprint": "abc123..."
}
```

---

### 2️⃣ **Utilisateur entre le code depuis l'email**

Frontend envoie au endpoint `/auth/devices/verify`:
```json
{
  "verificationCode": "123456",
  "deviceFingerprint": "abc123...",
  "deviceName": "Mon iPhone 14"
}
```

Si le code est correct:
- ✅ Device approuvé et sauvegardé
- ✅ Les tokens de connexion sont générés
- ✅ Prochaines connexions depuis ce device = pas besoin de re-vérifier

**Réponse:**
```json
{
  "message": "Device approuvé avec succès",
  "device": {
    "id": "device_123",
    "deviceName": "Mon iPhone 14",
    "createdAt": "2026-04-22T..."
  }
}
```

---

### 3️⃣ **Connexions suivantes**

```
Utilisateur se connecte
        ↓
Serveur génère fingerprint du device
        ↓
Est-ce un device connu & approuvé? OUI
        ↓
Générer tokens normalement ✅
```

**Réponse:**
```json
{
  "requiresDeviceVerification": false,
  "accessToken": "eyJhbGc...",
  "refreshToken": "uuid...",
  "user": { ... }
}
```

---

## 🛡️ Protection contre la fraude

### Maximum 2 appareils
- Si l'utilisateur essaie d'ajouter un 3e device:
```json
{
  "statusCode": 403,
  "message": "Vous avez atteint le nombre maximum d'appareils de confiance (2). Supprimez un device pour en ajouter un nouveau."
}
```

### Le même fingerprint = Pas de re-vérification
- IP peut changer (4G → WiFi): ✅ Pas de problème
- Même appareil, même fingerprint: ✅ Approuvé automatiquement

### L'ami ne peut pas accéder
- Chaque device a un **fingerprint unique**
- Le fingerprint inclut: User Agent + Device ID
- L'ami ne peut pas dupliquer le fingerprint
- Si l'ami entre le code de l'email → Créé un 3e device (refusé)

---

## 📱 Endpoints API

### 1. Vérifier un device
```http
POST /auth/devices/verify
Authorization: Bearer <token>

{
  "verificationCode": "123456",
  "deviceFingerprint": "abc123...",
  "deviceName": "Mon iPhone 14"  // optionnel
}
```

**Réponse 200:**
```json
{
  "message": "Device approuvé avec succès",
  "device": { ... }
}
```

**Erreurs possibles:**
- `401 Unauthorized`: Code incorrect
- `400 Bad Request`: Code expiré
- `429 Too Many Requests`: Trop de tentatives

---

### 2. Lister les devices approuvés
```http
GET /auth/devices/trusted
Authorization: Bearer <token>
```

**Réponse:**
```json
[
  {
    "id": "device_1",
    "deviceName": "iPhone Safari",
    "deviceFingerprint": "abc123...",
    "lastUsedAt": "2026-04-22T15:30:00Z",
    "createdAt": "2026-04-20T10:00:00Z"
  },
  {
    "id": "device_2",
    "deviceName": "Windows Chrome",
    "deviceFingerprint": "def456...",
    "lastUsedAt": "2026-04-21T18:45:00Z",
    "createdAt": "2026-04-15T08:00:00Z"
  }
]
```

---

### 3. Révoquer un device
```http
DELETE /auth/devices/:deviceId
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "message": "Device supprimé de la liste des appareils de confiance"
}
```

---

## 🔧 Configuration Frontend

### Étape 1: Login normal
```typescript
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Device-ID': generateDeviceId(), // UUID du device
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();

if (data.requiresDeviceVerification) {
  // Nouveau device - demander code
  showVerificationCodeDialog(data.deviceFingerprint);
} else {
  // Device connu - connexion OK
  saveToken(data.accessToken);
  redirectToDashboard();
}
```

### Étape 2: Vérifier le device
```typescript
const verifyDevice = async (code) => {
  const response = await fetch('/auth/devices/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      verificationCode: code,
      deviceFingerprint: deviceFingerprint,
      deviceName: 'Mon iPhone 14'
    })
  });

  if (response.ok) {
    // Device approuvé - rediriger
    redirectToDashboard();
  } else {
    // Code incorrect
    showError('Code incorrect');
  }
};
```

---

## 📊 Points importants pour les administrateurs

### Audit des devices
```sql
-- Lister tous les devices de confiance par utilisateur
SELECT 
  u.email,
  td.deviceName,
  td.lastUsedAt,
  td.createdAt
FROM "TrustedDevice" td
JOIN "User" u ON td.userId = u.id
ORDER BY u.email, td.lastUsedAt DESC;
```

### Détecter les fraudes
```sql
-- Utilisateurs avec trop de tentatives échouées
SELECT 
  dv.userId,
  COUNT(*) as failed_attempts,
  MAX(dv.createdAt) as last_attempt
FROM "DeviceVerification" dv
WHERE dv.attempts > 3
  AND dv.createdAt > NOW() - INTERVAL '1 day'
GROUP BY dv.userId;
```

---

## 🚀 Prochaines améliorations (optionnel)

1. **Localisation géographique**: Bloquer si IP change entre pays
2. **Notifications en temps réel**: Alerter l'utilisateur de chaque nouvelle connexion
3. **Admin Dashboard**: Voir tous les devices par utilisateur
4. **Biométrique**: Ajouter fingerprint biométrique (Face ID, Touch ID)
5. **Session simultanées**: Bloquer connexions simultanées sur différents devices

---

## ❓ FAQ

**Q: L'utilisateur peut-il utiliser PC et Téléphone en même temps?**
R: Oui! Chacun avec son fingerprint unique. Max 2 appareils.

**Q: Que se passe-t-il si on partage le compte?**
R: L'ami ne peut pas vérifier son device (pas accès à l'email). Le 3e device = refusé.

**Q: Si on change d'IP (4G → WiFi)?**
R: Pas de problème! Le fingerprint reste le même (basé sur device, pas IP).

**Q: Code expiré, comment faire?**
R: Se reconnecter normalement. Un nouveau code sera envoyé.

**Q: Je veux supprimer un device?**
R: DELETE `/auth/devices/:deviceId`

