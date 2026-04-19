import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ResetPasswordDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ACTIVE_SESSIONS = 2;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email déjà utilisé');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        fullName: dto.fullName,
        phone: dto.phone,
      },
    });

    return { message: 'Compte créé avec succès', userId: user.id };
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

    // Gérer la limite de sessions (MAX 2 appareils)
    await this.enforceSessionLimit(user.id, deviceInfo.deviceId);

    // Créer session
    await this.prisma.session.upsert({
      where: {
        id: `${user.id}_${deviceInfo.deviceId}`.slice(0, 25),
      },
      update: {
        isActive: true,
        lastActive: new Date(),
        ipAddress: deviceInfo.ip,
        deviceInfo: deviceInfo.userAgent,
      },
      create: {
        id: `${user.id}_${deviceInfo.deviceId}`.slice(0, 25),
        userId: user.id,
        deviceId: deviceInfo.deviceId,
        deviceInfo: deviceInfo.userAgent,
        ipAddress: deviceInfo.ip,
        isActive: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.role, deviceInfo.deviceId);
    return {
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

  async logout(userId: string, deviceId: string) {
    const sessionId = `${userId}_${deviceId}`.slice(0, 25);
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('Session introuvable');

    await this.prisma.session.update({
      where: { id: sessionId },
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
