'use client';
import { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface Props {
  durationSeconds: number;
  onExpire: () => void;
}

export function ExamTimer({ durationSeconds, onExpire }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const pct = (remaining / durationSeconds) * 100;
  const isWarning = remaining < 300;
  const isCritical = remaining < 60;

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');

  return (
    <div className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border shadow-sm">
      <div className="flex items-center gap-4 px-5 py-3">
        <div className={`flex items-center gap-2 font-mono font-bold text-lg tabular-nums flex-shrink-0 transition-colors ${
          isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-foreground'
        }`}>
          {isWarning
            ? <AlertTriangle className="w-4 h-4" />
            : <Timer className="w-4 h-4 text-primary" />}
          {mins}:{secs}
        </div>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : ''
            }`}
            style={{
              width: `${pct}%`,
              background: isCritical ? undefined : isWarning ? undefined : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
          {Math.ceil(remaining / 60)} min restantes
        </span>
      </div>
    </div>
  );
}
