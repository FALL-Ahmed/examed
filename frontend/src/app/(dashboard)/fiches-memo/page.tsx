'use client';
import { useEffect, useState } from 'react';
import { userApi, api } from '@/lib/api';
import { useLang } from '@/components/LanguageProvider';
import { FileText, X, ZoomIn } from 'lucide-react';

function useFicheBlob(ficheId: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!ficheId) return;
    let url: string | null = null;
    api.get(`/users/fiches-memo/${ficheId}/view`, { responseType: 'blob' })
      .then(r => {
        url = URL.createObjectURL(r.data);
        setBlobUrl(url);
      })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [ficheId]);

  return blobUrl;
}

function FicheModal({ f, onClose }: { f: any; onClose: () => void }) {
  const blobUrl = useFicheBlob(f.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
          <p className="text-white font-semibold text-sm truncate">{f.title}</p>
          <button onClick={onClose} className="text-white/60 hover:text-white transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="overflow-auto flex-1 select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {blobUrl ? (
            <img
              src={blobUrl}
              alt={f.title}
              className="w-full h-auto"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitUserDrag: 'none' } as any}
            />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FicheCard({ f, isAr, onOpen }: { f: any; isAr: boolean; onOpen: () => void }) {
  const blobUrl = useFicheBlob(f.id);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:shadow-md hover:border-emerald-400/40 transition-all duration-200">
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

export default function FichesMemoPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [fiches, setFiches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    userApi.fichesMemo().then(r => setFiches(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isAr ? 'بطاقات المراجعة' : 'Fiches Mémo'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? 'كل ما تحتاج لحفظه قبل يوم المسابقة'
            : 'Tout ce que vous devez retenir avant le jour du concours'}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {fiches.map((f) => (
            <FicheCard key={f.id} f={f} isAr={isAr} onOpen={() => setSelected(f)} />
          ))}
        </div>
      )}

      {selected && (
        <FicheModal f={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
