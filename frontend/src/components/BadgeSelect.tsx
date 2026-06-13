'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface BadgeSelectOption {
  value: string;
  label: string;
  isNew?: boolean;
  count?: number;
}

interface Props {
  options: BadgeSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  newBadgeLabel?: string;
}

export function BadgeSelect({ options, value, onChange, placeholder = '', newBadgeLabel = 'Nouveau' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected && selected.value !== '' ? (
            <>
              <span className="truncate">{selected.label}</span>
              {selected.isNew && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500 text-white">{newBadgeLabel}</span>
              )}
              {selected.count !== undefined && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">({selected.count} q.)</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full">
          {/* overflow-hidden on outer + overflow-y-auto on inner allows gradient overlay */}
          <div className="relative bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition flex items-center justify-between gap-2
                    ${opt.value === value ? 'bg-primary/10 text-primary font-semibold' : ''}
                    ${opt.value === '' ? 'text-muted-foreground italic' : ''}
                  `}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{opt.label}</span>
                    {opt.isNew && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500 text-white">{newBadgeLabel}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {opt.count !== undefined && (
                      <span className="text-xs text-muted-foreground">{opt.count} q.</span>
                    )}
                    {opt.value === value && opt.value !== '' && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              ))}
            </div>
            {/* Scroll hint — visible on mobile where scrollbar is hidden */}
            {options.length > 6 && (
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none flex items-end justify-center pb-1">
                <ChevronDown className="w-4 h-4 text-primary animate-bounce" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
