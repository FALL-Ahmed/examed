'use client';
import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { userApi, api } from '@/lib/api';
import { translations } from '@/lib/i18n';
import { useLang } from '@/components/LanguageProvider';
import { FileText, X, ZoomIn, ZoomOut, Maximize2, Target, ArrowLeft, Download } from 'lucide-react';

function downloadFiche(blobUrl: string, title: string) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${title.replace(/[^\w\s-]/g, '').trim() || 'fiche-memo'}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  userApi.trackPdf(title, 'app').catch(() => {});
}

const PREP_COLORS: Record<number, string> = {
  1: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  2: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  3: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
};

function useFicheBlob(ficheId: string | null, thumb = false) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ficheId) return;
    let url: string | null = null;
    const endpoint = thumb
      ? `/users/fiches-memo/${ficheId}/thumb`
      : `/users/fiches-memo/${ficheId}/view`;
    api.get(endpoint, { responseType: 'blob' })
      .then(r => {
        url = URL.createObjectURL(r.data);
        setBlobUrl(url);
      })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [ficheId, thumb]);

  return blobUrl;
}

function FicheModal({ f, onClose, isAr }: { f: any; onClose: () => void; isAr: boolean }) {
  const blobUrl = useFicheBlob(f.id);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const stateRef = useRef({ scale: 1, pos: { x: 0, y: 0 } });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastDist = useRef(0);
  const lastMidpoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const applyScale = useCallback((nextScale: number, originX = 0, originY = 0) => {
    const s = Math.min(5, Math.max(1, nextScale));
    const prev = stateRef.current;
    const ratio = s / prev.scale;
    const x = originX + (prev.pos.x - originX) * ratio;
    const y = originY + (prev.pos.y - originY) * ratio;
    const next = { scale: s, pos: s === 1 ? { x: 0, y: 0 } : { x, y } };
    stateRef.current = next;
    setScale(next.scale);
    setPos(next.pos);
  }, []);

  // Wheel zoom (desktop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left - rect.width / 2;
      const oy = e.clientY - rect.top - rect.height / 2;
      applyScale(stateRef.current.scale * (1 - e.deltaY * 0.001), ox, oy);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [applyScale]);

  // Touch pinch + pan (mobile) — listeners non-passifs
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDist.current = Math.sqrt(dx * dx + dy * dy);
        lastMidpoint.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      } else if (e.touches.length === 1 && stateRef.current.scale > 1) {
        dragging.current = true;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / lastDist.current;
        lastDist.current = dist;
        const rect = el.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const ox = mx - rect.left - rect.width / 2;
        const oy = my - rect.top - rect.height / 2;
        applyScale(stateRef.current.scale * ratio, ox, oy);
      } else if (e.touches.length === 1 && dragging.current) {
        const dx = e.touches[0].clientX - lastMouse.current.x;
        const dy = e.touches[0].clientY - lastMouse.current.y;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const next = { ...stateRef.current, pos: { x: stateRef.current.pos.x + dx, y: stateRef.current.pos.y + dy } };
        stateRef.current = next;
        setPos(next.pos);
      }
    };

    const touchEnd = () => { dragging.current = false; };

    el.addEventListener('touchstart', touchStart, { passive: false });
    el.addEventListener('touchmove', touchMove, { passive: false });
    el.addEventListener('touchend', touchEnd);
    return () => {
      el.removeEventListener('touchstart', touchStart);
      el.removeEventListener('touchmove', touchMove);
      el.removeEventListener('touchend', touchEnd);
    };
  }, [applyScale]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (stateRef.current.scale <= 1) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    const next = { ...stateRef.current, pos: { x: stateRef.current.pos.x + dx, y: stateRef.current.pos.y + dy } };
    stateRef.current = next;
    setPos(next.pos);
  };
  const onMouseUp = () => { dragging.current = false; };

  const resetZoom = () => { stateRef.current = { scale: 1, pos: { x: 0, y: 0 } }; setScale(1); setPos({ x: 0, y: 0 }); };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" style={{ height: '100dvh' }} onClick={onClose}>
      <div className="flex flex-col w-full" style={{ height: '100dvh' }} onClick={(e) => e.stopPropagation()}>
        {/* Barre titre */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
          <p className="text-white font-semibold text-sm truncate max-w-[60%]">{f.title}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => applyScale(stateRef.current.scale + 0.5)} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => applyScale(stateRef.current.scale - 0.5)} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
              <ZoomOut className="w-4 h-4" />
            </button>
            {scale > 1 && (
              <button onClick={resetZoom} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            <span className="text-white/30 text-xs w-9 text-center">{Math.round(scale * 100)}%</span>
            {blobUrl && (
              <button
                onClick={() => downloadFiche(blobUrl, f.title)}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition ml-1"
                title={isAr ? 'تحميل' : 'Télécharger'}
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zone image zoomable */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-hidden flex items-center justify-center select-none"
          style={{ cursor: scale > 1 ? 'grab' : 'default', touchAction: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {blobUrl ? (
            <img
              src={blobUrl}
              alt={f.title}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: dragging.current ? 'none' : 'transform 0.05s ease-out',
                WebkitUserDrag: 'none',
                userSelect: 'none',
              } as any}
            />
          ) : (
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
        </div>
      </div>
    </div>
  );
}

function FicheCard({ f, isAr, onOpen }: { f: any; isAr: boolean; onOpen: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const blobUrl = useFicheBlob(visible ? f.id : null, true);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: '300px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={cardRef} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:shadow-md hover:border-emerald-400/40 transition-all duration-200">
      <button
        onClick={onOpen}
        className="w-full aspect-[4/3] bg-secondary overflow-hidden flex items-center justify-center relative group"
      >
        {blobUrl ? (
          <img
            src={blobUrl}
            alt={f.title}
            className="w-full h-full object-cover object-top"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </button>

      <div className="p-3 flex items-center justify-between gap-2">
        <p className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{f.title}</p>
        <button
          onClick={onOpen}
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        >
          {isAr ? 'عرض' : 'Voir'}
        </button>
      </div>
    </div>
  );
}

function FichesMemoInner() {
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const isAr = lang === 'ar';
  const T = translations[lang as 'fr' | 'ar'] ?? translations.fr;
  const t = (k: string) => (T as any)[k] ?? k;
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const prepDay = searchParams.get('day') ? parseInt(searchParams.get('day')!) : null;
  const prepColor = prepDay ? PREP_COLORS[prepDay] ?? PREP_COLORS[1] : null;

  useEffect(() => {
    userApi.fichesMemo(lang.toUpperCase()).then(r => setFiches(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [lang]);

  // Diviser fiches en 3 groupes
  const third = Math.ceil(fiches.length / 3);
  const dayFiches = prepDay ? fiches.slice((prepDay - 1) * third, prepDay * third) : [];
  const otherFiches = prepDay ? fiches.filter(f => !dayFiches.includes(f)) : fiches;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Banner préparation */}
      {prepDay && (
        <div className="rounded-2xl p-5 text-white flex items-center justify-between gap-4" style={{ background: prepColor! }}>
          <div className="flex items-center gap-3">
            <Target size={20} className="text-white/80 flex-shrink-0" />
            <div>
              <div className="text-xs text-white/70 font-medium uppercase tracking-wide">{t('prep.prepBanner')}</div>
              <div className="font-bold">{t('prep.dayN')} {prepDay} — {dayFiches.length} {t('prep.totalFiches')}</div>
            </div>
          </div>
          <Link href="/preparation-concours" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition flex-shrink-0">
            <ArrowLeft size={15} /> {isAr ? 'رجوع' : 'Retour'}
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">
          {prepDay
            ? (isAr ? `المراجعة — اليوم ${prepDay}` : `Révision Jour ${prepDay}`)
            : (isAr ? 'بطاقات المراجعة' : 'Fiches Mémo')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {prepDay
            ? (isAr ? `بطاقات اليوم ${prepDay} من برنامج J-4` : `Fiches du Jour ${prepDay} — Programme J-4`)
            : (isAr ? 'كل ما تحتاج لحفظه قبل يوم المسابقة' : 'Tout ce que vous devez retenir avant le jour du concours')}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fiches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileText className="w-7 h-7 text-violet-400" />
          </div>
          <p className="font-semibold">
            {isAr ? 'لا توجد بطاقات بعد' : 'Aucune fiche disponible pour l\'instant'}
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isAr ? 'ستظهر هنا بطاقات المراجعة قريباً' : 'Les fiches seront ajoutées prochainement'}
          </p>
        </div>
      ) : (
        <>
          {/* Fiches du jour (mode prépa) */}
          {prepDay && dayFiches.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
                {t('prep.reviseToday')} {prepDay}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {dayFiches.map((f) => (
                  <FicheCard key={f.id} f={f} isAr={isAr} onOpen={() => setSelected(f)} />
                ))}
              </div>
            </div>
          )}

          {/* Toutes les fiches (ou autres si mode prépa) */}
          {prepDay && otherFiches.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">{t('prep.otherFiches')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 opacity-50">
                {otherFiches.map((f) => (
                  <FicheCard key={f.id} f={f} isAr={isAr} onOpen={() => setSelected(f)} />
                ))}
              </div>
            </div>
          )}

          {/* Mode normal : toutes les fiches */}
          {!prepDay && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {fiches.map((f) => (
                <FicheCard key={f.id} f={f} isAr={isAr} onOpen={() => setSelected(f)} />
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <FicheModal f={selected} onClose={() => setSelected(null)} isAr={isAr} />
      )}
    </div>
  );
}

export default function FichesMemoPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FichesMemoInner />
    </Suspense>
  );
}
