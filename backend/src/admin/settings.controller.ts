import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';

const OPERATOR_DEFAULTS: Record<string, { name: string; phone: string }> = {
  BANKILY: { name: 'Bankily', phone: '+222 20 00 00 01' },
  MASRIVI: { name: 'Masrivi', phone: '+222 30 00 00 01' },
  SEDAD:   { name: 'Sedad',   phone: '+222 40 00 00 01' },
};

@Controller('settings')
export class SettingsController {
  constructor(private adminService: AdminService) {}

  @Get('price')
  async getPrice() {
    const raw = await this.adminService.getSetting('PREMIUM_PRICE');
    return { price: raw ? parseInt(raw) : 500 };
  }

  @Get('whatsapp')
  async getWhatsapp() {
    const phone = await this.adminService.getSetting('WHATSAPP_PHONE');
    return { phone: phone ?? null };
  }

  @Get('pricing')
  async getPricing() {
    const [price1m, price3m, priceGroup, groupMin] = await Promise.all([
      this.adminService.getSetting('PRICE_1M'),
      this.adminService.getSetting('PRICE_3M'),
      this.adminService.getSetting('PRICE_GROUP_PER_PERSON'),
      this.adminService.getSetting('GROUP_MIN_MEMBERS'),
    ]);
    return {
      solo1m:    { price: price1m    ? parseInt(price1m)    : 500,  duration: 30 },
      solo3m:    { price: price3m    ? parseInt(price3m)    : 1200, duration: 90 },
      groupPerP: { price: priceGroup ? parseInt(priceGroup) : 400  },
      groupMin:  groupMin ? parseInt(groupMin) : 5,
    };
  }

  @Get('contact')
  async getContact() {
    const [whatsapp, email] = await Promise.all([
      this.adminService.getSetting('WHATSAPP_PHONE'),
      this.adminService.getSetting('SUPPORT_EMAIL'),
    ]);
    return { whatsapp: whatsapp ?? null, email: email ?? null };
  }

  @Get('operators')
  async getOperators() {
    const keys = Object.keys(OPERATOR_DEFAULTS).map((id) => `${id}_PHONE`);
    const values = await Promise.all(keys.map((k) => this.adminService.getSetting(k)));
    return Object.keys(OPERATOR_DEFAULTS).map((id, i) => ({
      id,
      name: OPERATOR_DEFAULTS[id].name,
      phone: values[i] ?? OPERATOR_DEFAULTS[id].phone,
    }));
  }
}
