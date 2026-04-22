import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ThemesService {
  constructor(private prisma: PrismaService) {}

  findAll(language?: string) {
    return this.prisma.theme.findMany({
      where: language ? { language } : undefined,
      include: {
        subThemes: {
          select: { id: true, name: true, order: true, _count: { select: { questions: true } } },
          orderBy: { order: 'asc' },
        },
        _count: { select: { subThemes: true } },
      },
      orderBy: { order: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.theme.findUnique({
      where: { id },
      include: {
        subThemes: {
          include: { _count: { select: { questions: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });
  }
}
