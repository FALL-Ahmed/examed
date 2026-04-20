import 'multer';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async submitPayment(
    userId: string,
    dto: {
      amount: number;
      durationDays?: number;
      paymentMethod: string;
      operator?: string;
      planType?: string;
      groupSize?: number;
      notes?: string;
    },
    receipt?: Express.Multer.File,
  ) {
    let receiptUrl: string | undefined;
    if (receipt) {
      receiptUrl = await this.storage.uploadReceipt(receipt);
    }

    return this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        durationDays: dto.durationDays || 30,
        paymentMethod: dto.paymentMethod,
        operator: dto.operator,
        planType: dto.planType,
        groupSize: dto.groupSize ? Number(dto.groupSize) : undefined,
        receiptUrl,
      } as any,
    });
  }

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingPayments() {
    return this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { email: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async validatePayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.status !== 'PENDING') throw new BadRequestException('Paiement déjà traité');

    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + payment.durationDays);

    await this.prisma.user.update({
      where: { id: payment.userId },
      data: { role: 'PREMIUM', subscriptionEnd },
    });

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'VALIDATED', validatedBy: adminId, validatedAt: new Date() },
    });
  }

  async rejectPayment(paymentId: string, adminId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REJECTED', validatedBy: adminId, rejectionReason: reason },
    });
  }
}
