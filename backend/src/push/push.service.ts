import { Injectable, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  getPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY };
  }

  async subscribe(endpoint: string, p256dh: string, auth: string) {
    return this.prisma.adminPushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth },
      create: { endpoint, p256dh, auth },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.adminPushSubscription.deleteMany({ where: { endpoint } });
  }

  async notifyAdmins(title: string, body: string, url = '/admin/payments') {
    const subs = await this.prisma.adminPushSubscription.findMany();
    const payload = JSON.stringify({ title, body, url });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await this.prisma.adminPushSubscription.delete({ where: { id: sub.id } });
          }
        }
      }),
    );
  }
}
