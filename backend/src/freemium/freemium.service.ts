import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FreemiumConfig {
  enabled: boolean;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD (inclus)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class FreemiumService {
  constructor(private prisma: PrismaService) {}

  async getConfig(): Promise<FreemiumConfig> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['FREEMIUM_ENABLED', 'FREEMIUM_START', 'FREEMIUM_END'] } },
    });
    const get = (k: string) => rows.find((r) => r.key === k)?.value ?? null;
    return {
      enabled: get('FREEMIUM_ENABLED') === 'true',
      startDate: get('FREEMIUM_START'),
      endDate: get('FREEMIUM_END'),
    };
  }

  // Fin de campagne = fin de journée (UTC, = heure de Nouakchott)
  endOf(config: FreemiumConfig): Date | null {
    return config.endDate ? new Date(`${config.endDate}T23:59:59.999Z`) : null;
  }

  isOpen(config: FreemiumConfig, now = new Date()): boolean {
    if (!config.enabled || !config.startDate || !config.endDate) return false;
    const start = new Date(`${config.startDate}T00:00:00.000Z`);
    const end = this.endOf(config)!;
    return now >= start && now <= end;
  }

  async getPublicStatus() {
    const config = await this.getConfig();
    const open = this.isOpen(config);
    return { open, endDate: open ? config.endDate : null };
  }

  async updateConfig(dto: { enabled: boolean; startDate: string; endDate: string }) {
    if (!DATE_RE.test(dto.startDate ?? '') || !DATE_RE.test(dto.endDate ?? '')) {
      throw new BadRequestException('Dates invalides (format AAAA-MM-JJ)');
    }
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }
    const config: FreemiumConfig = { enabled: !!dto.enabled, startDate: dto.startDate, endDate: dto.endDate };
    await this.prisma.$transaction([
      ...[
        ['FREEMIUM_ENABLED', String(config.enabled)],
        ['FREEMIUM_START', config.startDate!],
        ['FREEMIUM_END', config.endDate!],
      ].map(([key, value]) =>
        this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
      // Aligne la fin d'essai de tous les comptes freemium sur la campagne (prolongation ou arrêt)
      this.prisma.user.updateMany({
        where: { role: 'FREEMIUM' },
        data: { subscriptionEnd: config.enabled ? this.endOf(config) : new Date() },
      }),
    ]);
    return this.getConfig();
  }

  // Arbre thèmes → sous-thèmes avec le nombre de questions et l'état freemium
  async getContentTree() {
    const themes = await this.prisma.theme.findMany({
      select: {
        id: true, name: true, language: true, target: true, order: true, isPublished: true,
        subThemes: {
          select: {
            id: true, name: true, order: true, isFreemium: true,
            _count: { select: { questions: { where: { isActive: true } } } },
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ target: 'asc' }, { language: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
    return themes.map((t) => ({
      ...t,
      subThemes: t.subThemes.map((s) => ({ id: s.id, name: s.name, isFreemium: s.isFreemium, questions: s._count.questions })),
    }));
  }

  async setSubThemes(subThemeIds: string[], isFreemium: boolean) {
    if (!Array.isArray(subThemeIds) || !subThemeIds.length) return { updated: 0 };
    const { count } = await this.prisma.subTheme.updateMany({
      where: { id: { in: subThemeIds } },
      data: { isFreemium: !!isFreemium },
    });
    return { updated: count };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: 'FREEMIUM' },
      select: { id: true, fullName: true, email: true, phone: true, profession: true, createdAt: true, subscriptionEnd: true },
      orderBy: { createdAt: 'desc' },
    });
    const ids = users.map((u) => u.id);
    const answers = ids.length
      ? await this.prisma.userAnswer.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } })
      : [];
    const countById = new Map(answers.map((a) => [a.userId, a._count._all]));
    return users.map((u) => ({ ...u, answered: countById.get(u.id) ?? 0 }));
  }
}
