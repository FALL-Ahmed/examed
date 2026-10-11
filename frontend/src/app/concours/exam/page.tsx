'use client';
import { ExamRunner } from '@/components/ExamRunner';
import { CONCOURS_STATE_KEY, concoursHome } from '../_shared';

export default function ConcoursExamPage() {
  return (
    <ExamRunner
      stateKey={CONCOURS_STATE_KEY}
      homePath={concoursHome}
      resultsPath="/concours/results"
      resultsNote={{ fr: 'Classement publié à la date annoncée', ar: 'سيُنشر الترتيب في الموعد المعلن' }}
    />
  );
}
