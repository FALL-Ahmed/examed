'use client';
import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';

const DISMISS_KEY = 'pwa_banner_dismissed_at';
const DISMISS_DAYS = 7;

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as any).standalone;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

export default function PWAInstallBanner() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const iosDevice = isIOS();
    setIos(iosDevice);

    if (iosDevice) {
      const t = setTimeout(() => { setShow(true); setTimeout(() => setVisible(true), 50); }, 800);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => { setShow(true); setTimeout(() => setVisible(true), 50); }, 800);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(() => setShow(false), 400);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setShow(false); }
    else { dismiss(); }
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0' : '120%'})`,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3" dir={isAr ? 'rtl' : 'ltr'}>
        <img src="/icon-192.png" alt="Al Bourour" className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-zinc-900 dark:text-white">
            {isAr ? 'تثبيت Al Bourour' : 'Installer Al Bourour'}
          </p>
          {ios ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-snug space-y-1">
              {isAr ? (
                <>
                  <p>١. افتح هذا الرابط في <strong>Safari</strong></p>
                  <p>٢. اضغط على <Share className="inline w-3 h-3 mx-0.5" /> أسفل الشاشة</p>
                  <p>٣. مرر للأسفل ← <strong>"إضافة إلى الشاشة الرئيسية"</strong></p>
                  <p>٤. اضغط <strong>"إضافة"</strong></p>
                </>
              ) : (
                <>
                  <p>1. Ouvre ce lien dans <strong>Safari</strong></p>
                  <p>2. Appuie sur <Share className="inline w-3 h-3 mx-0.5" /> en bas</p>
                  <p>3. Fais défiler → <strong>"Sur l'écran d'accueil"</strong></p>
                  <p>4. Appuie sur <strong>"Ajouter"</strong></p>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
              {isAr ? 'وصول سريع بدون متصفح' : 'Accès rapide sans passer par le navigateur'}
            </p>
          )}
          {!ios && (
            <button
              onClick={install}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              {isAr ? 'تثبيت' : 'Installer'}
            </button>
          )}
        </div>
        <button onClick={dismiss} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
