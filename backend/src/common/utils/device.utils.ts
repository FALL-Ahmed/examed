import * as crypto from 'crypto';

export interface DeviceInfo {
  userAgent: string;
  ip: string;
  deviceId: string;
}

/**
 * Génère un fingerprint unique d'un device basé sur ses caractéristiques
 * Cela permet d'identifier le même device même si l'IP change (4G → WiFi)
 */
export function generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
  const combined = `${deviceInfo.userAgent}-${deviceInfo.deviceId}`;
  return crypto
    .createHash('sha256')
    .update(combined)
    .digest('hex');
}

/**
 * Génère un code de vérification 6 chiffres
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Extrait le type de device du user agent
 * "iPhone", "Android", "Windows", "Mac", etc
 */
export function getDeviceType(userAgent: string): string {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  if (/Android/.test(userAgent)) return 'Android';
  if (/Windows/.test(userAgent)) return 'Windows';
  if (/Mac/.test(userAgent)) return 'Mac';
  if (/Linux/.test(userAgent)) return 'Linux';
  return 'Unknown';
}

/**
 * Extrait le navigateur du user agent
 */
export function getBrowserName(userAgent: string): string {
  if (/Chrome/.test(userAgent)) return 'Chrome';
  if (/Safari/.test(userAgent)) return 'Safari';
  if (/Firefox/.test(userAgent)) return 'Firefox';
  if (/Edge/.test(userAgent)) return 'Edge';
  return 'Unknown';
}

/**
 * Génère un nom human-friendly du device
 * "iPhone Safari", "Windows Chrome", etc
 */
export function generateDeviceName(userAgent: string): string {
  const deviceType = getDeviceType(userAgent);
  const browser = getBrowserName(userAgent);
  return `${deviceType} ${browser}`;
}
