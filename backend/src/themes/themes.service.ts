import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Thèmes accessibles aux étudiants 3ème année uniquement
const THEMES_3EME_ANNEE = [
  'PRATIQUE DE LA SCIENCE INFIRMIERE',
  'PHARMACOLOGIE',
  'LES MALADIES INFECTIEUSES',
  'ENDOCRINOLOGIE',
  'CARDIOLOGIE',
  'PEDIATRIE',
  'URGENCES CHIRURGICALES',
  'ANATOMIE ET PHYSIOLOGIE',
  'SEMIOLOGIE',
  // équivalents AR
  'الممارسة التمريضية',
  'الدوائية والعلاج',
  'الأمراض المعدية',
  'الغدد الصماء',
  'طب القلب والأوعية الدموية',
  'طب الأطفال',
  'الطوارئ الجراحية',
  'السيميولوجيا',
];

// Le nom du thème anatomie AR contient un suffixe entre parenthèses
const THEMES_3EME_ANNEE_PARTIAL = ['التشريح وعلم وظائف الأعضاء'];

@Injectable()
export class ThemesService {
  constructor(private prisma: PrismaService) {}

  async findAll(language?: string, userId?: string) {
    let profession: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { profession: true } });
      profession = user?.profession ?? null;
    }

    if (profession === 'etudiant_infirmier_3eme') {
      const themes = await this.prisma.theme.findMany({
        where: language ? { language } : undefined,
        include: {
          subThemes: {
            select: { id: true, name: true, order: true, _count: { select: { questions: true } } },
            orderBy: { name: 'asc' },
          },
          _count: { select: { subThemes: true } },
        },
        orderBy: { name: 'asc' },
      });
      return themes.filter(t =>
        THEMES_3EME_ANNEE.includes(t.name) ||
        THEMES_3EME_ANNEE_PARTIAL.some(p => t.name.startsWith(p))
      );
    }

    return this.prisma.theme.findMany({
      where: language ? { language } : undefined,
      include: {
        subThemes: {
          select: { id: true, name: true, order: true, _count: { select: { questions: true } } },
          orderBy: { name: 'asc' },
        },
        _count: { select: { subThemes: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.theme.findUnique({
      where: { id },
      include: {
        subThemes: {
          include: { _count: { select: { questions: true } } },
          orderBy: { name: 'asc' },
        },
      },
    });
  }
}
