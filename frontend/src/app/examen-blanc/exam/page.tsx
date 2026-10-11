'use client';
import { ExamRunner } from '@/components/ExamRunner';

const homePath = (target: string) =>
  target === 'SAGE_FEMME' ? '/examen-blanc/sage-femme' : target === 'BIOLOGISTE' ? '/examen-blanc/biologiste' : '/examen-blanc';

export default function ExamPage() {
  return (
    <ExamRunner
      stateKey="examen_blanc_state"
      testStateKey="examen_blanc_test_state"
      homePath={homePath}
      resultsPath="/examen-blanc/results"
    />
  );
}
