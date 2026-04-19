import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_secret',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    // Vérifier que la session est toujours active
    const session = await this.prisma.session.findFirst({
      where: { userId: payload.sub, deviceId: payload.deviceId, isActive: true },
    });
    if (!session) throw new UnauthorizedException('Session révoquée');

    return { sub: payload.sub, role: payload.role, deviceId: payload.deviceId };
  }
}
