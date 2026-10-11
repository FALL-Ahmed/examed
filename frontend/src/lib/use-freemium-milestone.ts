'use client';
import { useCallback, useState } from 'react';

// Palier de questions répondues à partir duquel on propose Premium (puis tous les 40)
export const FREEMIUM_MILESTONE_STEP = 40;

// Affiche la fenêtre « Bravo, déjà N questions » une seule fois par palier atteint
export function useFreemiumMilestone(userId?: string) {
  const [milestone, setMilestone] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);

  const check = useCallback((answeredTotal?: number, correctTotal?: number) => {
    if (!userId || typeof answeredTotal !== 'number') return;
    const reached = Math.floor(answeredTotal / FREEMIUM_MILESTONE_STEP) * FREEMIUM_MILESTONE_STEP;
    if (reached < FREEMIUM_MILESTONE_STEP) return;
    const key = `freemium_milestone_${userId}`;
    let shown = 0;
    try { shown = Number(localStorage.getItem(key) || 0); } catch {}
    if (reached <= shown) return;
    try { localStorage.setItem(key, String(reached)); } catch {}
    setCorrect(Math.round(((correctTotal ?? 0) / answeredTotal) * 100));
    setMilestone(reached);
  }, [userId]);

  return { milestone, successRate: correct, check, close: () => setMilestone(null) };
}
