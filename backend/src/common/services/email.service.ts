import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend = new Resend(process.env.RESEND_API_KEY);
  private from = process.env.RESEND_FROM_EMAIL || 'Al Bourour <noreply@albourour.mr>';

  async sendDeviceVerificationCode(email: string, verificationCode: string, deviceName: string): Promise<boolean> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: '🔐 Code de vérification - Al Bourour',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#7c3aed,#6366f1);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:white;margin:0;">Vérification de connexion</h2>
            </div>
            <div style="background:#fafafa;padding:30px;border-radius:0 0 12px 12px;border:1px solid #eee;">
              <p>Bonjour,</p>
              <p>Une connexion depuis un nouvel appareil a été détectée :</p>
              <div style="background:#f0f0f0;padding:12px 16px;border-radius:8px;margin:16px 0;">
                <strong>Appareil :</strong> ${deviceName}
              </div>
              <p>Votre code de vérification :</p>
              <div style="background:linear-gradient(135deg,#7c3aed,#6366f1);color:white;padding:24px;border-radius:10px;text-align:center;margin:20px 0;">
                <span style="font-size:36px;font-weight:bold;letter-spacing:8px;font-family:monospace;">${verificationCode}</span>
              </div>
              <p style="color:#888;font-size:13px;">⏰ Ce code expire dans <strong>24 heures</strong></p>
              <p style="color:#c00;">⚠️ Si vous n'avez pas tenté cette connexion, ignorez cet email.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <p style="color:#bbb;font-size:11px;text-align:center;">© 2026 Al Bourour — Tous droits réservés</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`✅ Email envoyé à ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email: ${error.message}`);
      return false;
    }
  }

  async sendNewDeviceNotification(email: string, deviceName: string, location: string): Promise<boolean> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: '🔔 Nouvelle connexion détectée - Al Bourour',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#7c3aed,#6366f1);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:white;margin:0;">Nouvelle connexion détectée</h2>
            </div>
            <div style="background:#fafafa;padding:30px;border-radius:0 0 12px 12px;border:1px solid #eee;">
              <p>Bonjour,</p>
              <p>Votre compte a été accédé depuis un nouvel appareil :</p>
              <div style="background:#f0f0f0;padding:12px 16px;border-radius:8px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Appareil :</strong> ${deviceName}</p>
                <p style="margin:4px 0;"><strong>Localisation :</strong> ${location}</p>
                <p style="margin:4px 0;"><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
              </div>
              <p style="color:#c00;">Si ce n'est pas vous, <strong>changez immédiatement votre mot de passe</strong>.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <p style="color:#bbb;font-size:11px;text-align:center;">© 2026 Al Bourour — Tous droits réservés</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`✅ Notification envoyée à ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi notification: ${error.message}`);
      return false;
    }
  }
}
