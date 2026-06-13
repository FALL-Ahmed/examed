'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { sentenceCase } from '@/lib/utils';
import { NEW_THEME_IDS, NEW_SUBTHEME_IDS, newLabel } from '@/lib/new-content';
import { useLang } from '@/components/LanguageProvider';

interface Theme {
  id: string;
  name: string;
  subThemes?: { id: string; name: string; _count?: { questions: number } }[];
}

interface Props {
  themes: Theme[];
  themeId: string;
  subThemeId?: string;
  onSelect: (themeId: string, subThemeId?: string) => void;
  allLabel?: string;
  withSubThemes?: boolean;
}

interface Result {
  type: 'all' | 'theme' | 'subtheme';
  themeId: string;
  themeName: string;
  subThemeId?: string;
  subThemeName?: string;
  count?: number;
}

export function ThemeSearchInput({ themes, themeId, subThemeId, onSelect, allLabel = 'Tous les thèmes', withSubThemes = false }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLang();

  // Label affiché dans l'input quand une sélection est active
  const selectedLabel = (() => {
    if (!themeId) return '';
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return '';
    if (subThemeId) {
      const sub = theme.subThemes?.find((s) => s.id === subThemeId);
      return sub ? `${sentenceCase(theme.name)} / ${sentenceCase(sub.name)}` : sentenceCase(theme.name);
    }
    return sentenceCase(theme.name);
  })();

  // Fermer au clic extérieur
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Construire la liste filtrée
  const results: Result[] = [];

  const q = query.trim().toLowerCase();

  if (!q) {
    results.push({ type: 'all', themeId: '', themeName: allLabel });
  }

  for (const theme of themes) {
    const themeMatch = !q || theme.name.toLowerCase().includes(q);

    if (withSubThemes && theme.subThemes?.length) {
      // Chercher dans les sous-thèmes
      const matchingSubs = theme.subThemes.filter((s) =>
        !q || s.name.toLowerCase().includes(q) || theme.name.toLowerCase().includes(q)
      );

      if (themeMatch && !q) {
        results.push({ type: 'theme', themeId: theme.id, themeName: theme.name });
      }

      for (const sub of matchingSubs) {
        results.push({
          type: 'subtheme',
          themeId: theme.id,
          themeName: theme.name,
          subThemeId: sub.id,
          subThemeName: sub.name,
          count: sub._count?.questions,
        });
      }

      if (themeMatch && q) {
        results.unshift({ type: 'theme', themeId: theme.id, themeName: theme.name });
      }
    } else {
      if (themeMatch) {
        results.push({ type: 'theme', themeId: theme.id, themeName: theme.name });
      }
    }
  }

  function select(r: Result) {
    onSelect(r.themeId, r.subThemeId);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onSelect('', undefined);
    setQuery('');
  }

  const displayValue = open ? query : (selectedLabel || query);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={allLabel}
          className="w-full pl-9 pr-9 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
        />
        {(themeId || query) && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => select(r)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition flex items-center justify-between gap-2
                ${r.type === 'all' ? 'text-muted-foreground italic' : ''}
                ${r.type === 'subtheme' ? 'pl-7' : ''}
                ${r.themeId === themeId && r.subThemeId === subThemeId ? 'bg-primary/10 font-semibold text-primary' : ''}
              `}
            >
              <span className="flex items-center gap-1.5 flex-wrap">
                {r.type === 'all' && allLabel}
                {r.type === 'theme' && (
                  <>
                    {sentenceCase(r.themeName)}
                    {NEW_THEME_IDS.has(r.themeId) && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500 text-white">{lang === 'ar' ? 'جديد' : 'Nouveau'}</span>
                    )}
                  </>
                )}
                {r.type === 'subtheme' && (
                  <>
                    <span className="text-muted-foreground text-xs">{sentenceCase(r.themeName)} / </span>
                    {sentenceCase(r.subThemeName!)}
                    {(NEW_SUBTHEME_IDS.has(r.subThemeId!) || NEW_THEME_IDS.has(r.themeId)) && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500 text-white">{lang === 'ar' ? 'جديد' : 'Nouveau'}</span>
                    )}
                  </>
                )}
              </span>
              {r.count !== undefined && (
                <span className="text-xs text-muted-foreground flex-shrink-0">{r.count} q.</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
