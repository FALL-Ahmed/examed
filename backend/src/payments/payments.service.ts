import 'multer';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PushService } from '../push/push.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private push: PushService,
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
      groupEmails?: string[];
      notes?: string;
    },
    receipt?: Express.Multer.File,
  ) {
    if (!receipt) throw new BadRequestException('Le reçu de paiement est obligatoire.');
    const receiptUrl = await this.storage.uploadReceipt(receipt);

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        durationDays: dto.durationDays || 30,
        paymentMethod: dto.paymentMethod,
        operator: dto.operator,
        planType: dto.planType,
        groupSize: dto.groupSize ? Number(dto.groupSize) : undefined,
        receiptUrl: receiptUrl,
      } as any,
    });

    if (dto.planType === 'GROUP' && dto.groupEmails?.length) {
      const emails = [...new Set(dto.groupEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
      await this.prisma.groupInvite.createMany({
        data: emails.map((email) => ({ email, paymentId: payment.id })),
        skipDuplicates: true,
      });
    }

    this.push.notifyAdmins('💳 Nouveau paiement', `Un paiement de ${dto.amount} MRU est en attente de validation.`).catch(() => {});

    return payment;
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

    // Activate group invites so members can register with auto-premium
    if (payment.planType === 'GROUP') {
      await (this.prisma as any).groupInvite.updateMany({
        where: { paymentId, isActive: false },
        data: { isActive: true },
      });
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'VALIDATED', validatedBy: adminId, validatedAt: new Date() },
    });
  }

  async checkGroupInvite(email: string) {
    const invite = await (this.prisma as any).groupInvite.findFirst({
      where: { email: email.trim().toLowerCase(), isActive: true, isUsed: false },
      include: { payment: { select: { durationDays: true } } },
    });
    return { isInvited: !!invite, durationDays: invite?.payment?.durationDays ?? 30 };
  }

  async getPendingPaymentsWithInvites() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { email: true, fullName: true, phone: true } },
        groupInvites: { select: { email: true, isUsed: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return payments;
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
