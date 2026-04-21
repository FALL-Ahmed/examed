'use client';
import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import { MessageCircle, Mail, HeadphonesIcon } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';

export default function SupportPage() {
  const { t } = useLang();
  const [contact, setContact] = useState<{ whatsapp: string | null; email: string | null }>({ whatsapp: null, email: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.contact().then((r) => { setContact(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const waLink = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`
    : null;

  const mailLink = contact.email ? `mailto:${contact.email}` : null;

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* Header */}
      <div className="rounded-2xl p-6 md:p-8 text-white"
        style={{ background: 'linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
            <HeadphonesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{t('support.title')}</h1>
            <p className="text-white/70 text-sm mt-0.5">{t('support.contact')}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* WhatsApp */}
          {waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#25d36618', border: '1px solid #25d36630' }}>
                <MessageCircle className="w-7 h-7" style={{ color: '#25d366' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">WhatsApp</p>
                <p className="text-muted-foreground text-sm mt-0.5">{contact.whatsapp}</p>
                <p className="text-xs text-muted-foreground mt-1">Réponse rapide · Cliquez pour ouvrir</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                style={{ background: '#25d36615' }}>
                <svg className="w-4 h-4" style={{ color: '#25d366' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 opacity-50">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-base">WhatsApp</p>
                <p className="text-muted-foreground text-sm mt-0.5">Non configuré pour l'instant</p>
              </div>
            </div>
          )}

          {/* Email */}
          {mailLink ? (
            <a href={mailLink}
              className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-all group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#6366f118', border: '1px solid #6366f130' }}>
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">Email</p>
                <p className="text-muted-foreground text-sm mt-0.5">{contact.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Réponse sous 24h · Cliquez pour écrire</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-5 bg-card border border-border rounded-2xl p-6 opacity-50">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Mail className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-base">Email</p>
                <p className="text-muted-foreground text-sm mt-0.5">Non configuré pour l'instant</p>
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="bg-secondary/50 rounded-2xl p-5 border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour toute question concernant votre abonnement, un problème technique ou une demande de renouvellement — contactez-nous directement via l'un des canaux ci-dessus.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
