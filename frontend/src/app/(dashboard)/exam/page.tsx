'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { attemptsApi, themesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Zap, Loader2, ChevronDown, Timer, Play, PlayCircle, Trash2 } from 'lucide-react';
import { useLang } from '@/components/LanguageProvider';
import { sentenceCase } from '@/lib/utils';

export default function ExamConfigPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t, lang } = useLang();
  const [themes, setThemes] = useState<any[]>([]);
  const [config, setConfig] = useState({ themeId: '', count: 20, durationMinutes: 30 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedExam, setSavedExam] = useState<any>(null);

  useEffect(() => {
    themesApi.all(lang).then((r) => {
      setThemes(r.data);
      setConfig((c) => ({ ...c, themeId: '' }));
    }).catch(() => {});
  }, [lang]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('exam_state') || 'null');
      if (saved?.attemptId && saved?.session?.mode === 'EXAM') setSavedExam(saved);
    } catch {}
  }, []);

  async function startExam() {
    setLoading(true); setError('');
    try {
      const { data } = await attemptsApi.start({
        mode: 'EXAM',
        themeId: config.themeId || undefined,
        count: config.count,
        durationMinutes: config.durationMinutes,
        language: lang.toUpperCase(),
      });
      router.push(`/exam/${data.attemptId}?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du démarrage');
    } finally {
      setLoading(false);
    }
  }

  function resumeExam() {
    router.push(`/exam/${savedExam.attemptId}`);
  }

  function discardExam() {
    localStorage.removeItem('exam_state');
    setSavedExam(null);
  }

  const secPerQ = Math.round((config.durationMinutes * 60) / config.count);

  return (
    <div className="space-y-8">

      {/* Resume banner */}
      {savedExam && (
        <div className="flex items-center justify-between gap-4 bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-violet-900 text-sm">{t('exam.title')}</p>
              <p className="text-xs text-violet-600">
                {Object.keys(savedExam.answers || {}).length} / {savedExam.session?.questions?.length || '?'} {t('exam.answered')}
                {savedExam.remainingSeconds ? ` · ${Math.ceil(savedExam.remainingSeconds / 60)} min` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={discardExam}
              className="p-2 rounded-lg text-violet-400 hover:text-red-500 hover:bg-red-50 transition"
              title="Abandonner">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={resumeExam}
              className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
              <Play className="w-3.5 h-3.5 fill-white" /> {t('common.next')}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl p-6 md:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{t('exam.title')}</h1>
            <p className="text-white/70 text-sm mt-0.5">{t('exam.confirm')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-6">
          <h2 className="font-bold text-lg">{t('exam.title')}</h2>

          <div>
            <label className="block text-sm font-semibold mb-2">{t('practice.selectTheme')}</label>
            <div className="relative">
              <select
                value={config.themeId}
                onChange={(e) => setConfig({ ...config, themeId: e.target.value })}
                className="w-full appearance-none px-4 py-3 pr-10 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm cursor-pointer"
              >
                <option value="">{t('practice.allThemes')}</option>
                {themes.map((t) => <option key={t.id} value={t.id}>{sentenceCase(t.name)}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold">{t('practice.questions')}</label>
              <span className="text-2xl font-bold text-primary">{config.count}</span>
            </div>
            <input type="range" min={5} max={100} step={5}
              value={config.count}
              onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex gap-2 flex-wrap mt-3">
              {[10, 20, 30, 50].map((n) => (
                <button key={n} onClick={() => setConfig({ ...config, count: n })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${config.count === n
                    ? 'gradient-primary text-white border-transparent' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold">Durée</label>
              <span className="text-2xl font-bold text-primary">{config.durationMinutes}<span className="text-sm font-normal text-muted-foreground ml-1">{lang === 'ar' ? 'دقيقة' : 'min'}</span></span>
            </div>
            <input type="range" min={10} max={120} step={5}
              value={config.durationMinutes}
              onChange={(e) => setConfig({ ...config, durationMinutes: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          <button onClick={startExam} disabled={loading}
            className="w-full gradient-primary text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-violet-500/20">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}</> : <><Play className="w-4 h-4 fill-white" />{t('practice.start')}</>}
          </button>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">{t('exam.summary')}</h3>
            <div className="space-y-3">
              {[
                { icon: Zap, label: t('practice.questions'), value: config.count },
                { icon: Timer, label: t('exam.duration'), value: `${config.durationMinutes} ${lang === 'ar' ? 'دقيقة' : 'min'}` },
                { icon: Timer, label: t('exam.timePerQ'), value: `~${secPerQ} ${lang === 'ar' ? 'ث' : 's'}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                  <span className="font-semibold text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{t('exam.title')} :</strong> {t('exam.modeNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
