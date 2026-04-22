import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ResetPasswordDto, VerifyDeviceDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { generateDeviceFingerprint, generateVerificationCode, generateDeviceName, DeviceInfo } from '../common/utils/device.utils';

const MAX_ACTIVE_SESSIONS = 2;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  async register(dto: {
    email: string;
    password: string;
    fullName: string;
    pseudo?: string;
    gender?: string;
    profession?: string;
    wilaya?: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email déjà utilisé');

    if (dto.pseudo) {
      const pseudoTaken = await this.prisma.user.findFirst({ where: { pseudo: dto.pseudo } as any });
      if (pseudoTaken) throw new BadRequestException('Ce pseudo est déjà utilisé');
    }

    // Check if this email has an active group invite
    const invite = await (this.prisma as any).groupInvite.findFirst({
      where: { email: dto.email.trim().toLowerCase(), isActive: true, isUsed: false },
      include: { payment: { select: { durationDays: true } } },
    });

    const hash = await bcrypt.hash(dto.password, 12);

    let userData: any = {
      email: dto.email,
      passwordHash: hash,
      fullName: dto.fullName,
      phone: dto.phone || null,
      pseudo: dto.pseudo || null,
      gender: dto.gender || null,
      profession: dto.profession || null,
      wilaya: dto.wilaya || null,
    };

    if (invite) {
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + (invite.payment?.durationDays ?? 30));
      userData.role = 'PREMIUM';
      userData.subscriptionEnd = subscriptionEnd;
    }

    const user = await this.prisma.user.create({ data: userData });

    if (invite) {
      await (this.prisma as any).groupInvite.update({
        where: { id: invite.id },
        data: { isUsed: true, usedAt: new Date() },
      });
    }

    return { message: 'Compte créé avec succès', userId: user.id, groupActivated: !!invite };
  }

  async login(
    email: string,
    password: string,
    deviceInfo: { deviceId: string; userAgent: string; ip: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    // ──── VÉRIFIER LE DEVICE ────
    const deviceTrustResult = await this.checkDeviceTrust(user.id, deviceInfo);

    // ──── VÉRIFIER SI LA VÉRIFICATION D'APPAREIL EST ACTIVÉE ────
    const deviceVerifSetting = await this.prisma.setting.findUnique({ where: { key: 'DEVICE_VERIFICATION' } });
    const deviceVerifEnabled = deviceVerifSetting?.value === 'true';

    if (deviceVerifEnabled && user.role !== 'ADMIN') {
      const deviceTrustResult2 = await this.checkDeviceTrust(user.id, deviceInfo);
      if (!deviceTrustResult2.isTrusted) {
        // Générer les tokens quand même pour que le frontend puisse appeler verify-device
        await this.enforceSessionLimit(user.id, deviceInfo.deviceId);
        const tokens2 = await this.generateTokens(user.id, user.role, deviceInfo.deviceId);
        return {
          requiresDeviceVerification: true,
          deviceFingerprint: generateDeviceFingerprint(deviceInfo),
          accessToken: tokens2.accessToken,
          refreshToken: tokens2.refreshToken,
          user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, subscriptionEnd: user.subscriptionEnd },
        };
      }
    }

    // ──── DEVICE APPROUVÉ OU VÉRIFICATION DÉSACTIVÉE - CRÉER SESSION ────
    await this.enforceSessionLimit(user.id, deviceInfo.deviceId);

    // Créer ou mettre à jour la session pour ce device
    const existingSession = await this.prisma.session.findFirst({
      where: { userId: user.id, deviceId: deviceInfo.deviceId },
    });
    if (existingSession) {
      await this.prisma.session.update({
        where: { id: existingSession.id },
        data: { isActive: true, lastActive: new Date(), ipAddress: deviceInfo.ip, deviceInfo: deviceInfo.userAgent },
      });
    } else {
      await this.prisma.session.create({
        data: {
          userId: user.id,
          deviceId: deviceInfo.deviceId,
          deviceInfo: deviceInfo.userAgent,
          ipAddress: deviceInfo.ip,
          isActive: true,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role, deviceInfo.deviceId);
    return {
      requiresDeviceVerification: !deviceTrustResult.isTrusted,
      deviceFingerprint: !deviceTrustResult.isTrusted ? generateDeviceFingerprint(deviceInfo) : undefined,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        subscriptionEnd: user.subscriptionEnd,
      },
    };
  }

  async refresh(refreshToken: string, deviceId: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      // Refresh token réutilisé ou expiré → invalider toutes les sessions (vol détecté)
      if (tokenRecord) {
        await this.revokeAllUserSessions(tokenRecord.userId);
      }
      throw new UnauthorizedException('Session expirée, reconnectez-vous');
    }

    // Rotation: invalider l'ancien token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(tokenRecord.userId, tokenRecord.user.role, deviceId);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, token, password } = dto;
    let user;

    if (token) {
      // Chercher l'utilisateur par son jeton de réinitialisation unique
      user = await this.prisma.user.findFirst({ 
        where: { passwordResetToken: token } 
      });
      
      if (!user) throw new BadRequestException('Jeton de réinitialisation invalide ou expiré');
    } else if (email) {
      user = await this.prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      // Ne pas révéler si l'adresse existe ou non
      return { message: 'Si ce compte existe, le mot de passe a été modifié.' };
    }

    const hash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: hash,
        passwordResetToken: null // On supprime le jeton après utilisation
      },
    });

    await this.revokeAllUserSessions(user.id);

    return { message: 'Mot de passe réinitialisé avec succès. Connectez-vous avec votre nouveau mot de passe.' };
  }

  async checkGroupInvite(email: string) {
    if (!email) return { isInvited: false };
    const invite = await (this.prisma as any).groupInvite.findFirst({
      where: { email: email.trim().toLowerCase(), isActive: true, isUsed: false },
      include: { payment: { select: { durationDays: true } } },
    });
    return { isInvited: !!invite, durationDays: invite?.payment?.durationDays ?? 30 };
  }

  async logout(userId: string, deviceId: string) {
    const session = await this.prisma.session.findFirst({
      where: { userId, deviceId },
    });
    if (!session) throw new BadRequestException('Session introuvable');

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isActive: false },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId: session.deviceId },
      data: { isRevoked: true },
    });

    return { message: 'Session déconnectée' };
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({ where: { userId, isActive: true } });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new BadRequestException('Session introuvable');

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId: session.deviceId },
      data: { isRevoked: true },
    });

    return { message: 'Session révoquée' };
  }

  // ──── DEVICE TRUST METHODS ────

  /**
   * Vérifier si un device est de confiance pour cet utilisateur
   * Si non, envoyer un code de vérification par email
   */
  async checkDeviceTrust(userId: string, deviceInfo: { deviceId: string; userAgent: string; ip: string }) {
    const deviceFingerprint = generateDeviceFingerprint(deviceInfo);
    const deviceName = generateDeviceName(deviceInfo.userAgent);

    // Vérifier si le device est déjà de confiance
    const trustedDevice = await this.prisma.trustedDevice.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint,
        },
      },
    });

    if (trustedDevice && trustedDevice.isActive) {
      // Device de confiance, pas besoin de vérification
      await this.prisma.trustedDevice.update({
        where: { id: trustedDevice.id },
        data: { lastUsedAt: new Date() },
      });
      return { isTrusted: true, needsVerification: false };
    }

    // Vérifier le nombre de devices de confiance
    const trustedCount = await this.prisma.trustedDevice.count({
      where: { userId, isActive: true },
    });

    // Maximum 2 appareils de confiance
    if (trustedCount >= 2) {
      throw new ForbiddenException(
        'Vous avez atteint le nombre maximum d\'appareils de confiance (2). Supprimez un device pour en ajouter un nouveau.',
      );
    }

    // Créer une demande de vérification
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Valide 24h

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.deviceVerification.create({
      data: {
        userId,
        deviceFingerprint,
        verificationCode,
        expiresAt,
      },
    });

    // Envoyer email avec le code
    await this.email.sendDeviceVerificationCode(user.email, verificationCode, deviceName);

    return {
      isTrusted: false,
      needsVerification: true,
      message: 'Un code de vérification a été envoyé à votre email',
    };
  }

  /**
   * Vérifier le code et approuver le device
   */
  async verifyDevice(userId: string, dto: VerifyDeviceDto) {
    const { verificationCode, deviceFingerprint, deviceName } = dto;

    // Chercher la demande de vérification
    const verification = await this.prisma.deviceVerification.findFirst({
      where: {
        userId,
        deviceFingerprint,
        isUsed: false,
      },
    });

    if (!verification) {
      throw new BadRequestException('Demande de vérification introuvable ou expirée');
    }

    // Vérifier expiration
    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Code de vérification expiré. Essayez de vous reconnecter');
    }

    // Limiter les tentatives (max 5)
    if (verification.attempts >= 5) {
      throw new ForbiddenException('Trop de tentatives. Essayez plus tard.');
    }

    // Vérifier le code
    if (verification.verificationCode !== verificationCode) {
      await this.prisma.deviceVerification.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 },
      });
      throw new UnauthorizedException('Code de vérification incorrect');
    }

    // Marquer comme utilisé
    await this.prisma.deviceVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    // Créer le device de confiance
    const trustedDevice = await this.prisma.trustedDevice.create({
      data: {
        userId,
        deviceFingerprint,
        deviceName: deviceName || generateDeviceName('Unknown'),
        isActive: true,
      },
    });

    return {
      message: 'Device approuvé avec succès',
      device: {
        id: trustedDevice.id,
        deviceName: trustedDevice.deviceName,
        createdAt: trustedDevice.createdAt,
      },
    };
  }

  /**
   * Obtenir la liste des devices de confiance
   */
  async getTrustedDevices(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        deviceName: true,
        deviceFingerprint: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * Révoquer un device de confiance
   */
  async revokeTrustedDevice(userId: string, deviceId: string) {
    const device = await this.prisma.trustedDevice.findUnique({ where: { id: deviceId } });

    if (!device || device.userId !== userId) {
      throw new BadRequestException('Device introuvable');
    }

    await this.prisma.trustedDevice.update({
      where: { id: deviceId },
      data: { isActive: false },
    });

    return { message: 'Device supprimé de la liste des appareils de confiance' };
  }

  // ── Privé ──

  private async enforceSessionLimit(userId: string, currentDeviceId: string) {
    const activeSessions = await this.prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActive: 'asc' },
    });

    // Filtrer les sessions qui ne sont pas l'appareil actuel
    const otherSessions = activeSessions.filter((s) => s.deviceId !== currentDeviceId);

    // Si déjà à la limite, déconnecter la plus ancienne
    if (otherSessions.length >= MAX_ACTIVE_SESSIONS) {
      const oldest = otherSessions[0];
      await this.prisma.session.update({
        where: { id: oldest.id },
        data: { isActive: false },
      });
      await this.prisma.refreshToken.updateMany({
        where: { userId, deviceId: oldest.deviceId },
        data: { isRevoked: true },
      });
    }
  }

  private async generateTokens(userId: string, role: string, deviceId: string) {
    const payload = { sub: userId, role, deviceId };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, deviceId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private async revokeAllUserSessions(userId: string) {
    await this.prisma.session.updateMany({ where: { userId }, data: { isActive: false } });
    await this.prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
  }
}
