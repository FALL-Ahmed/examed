'use client';
import { useState } from 'react';
import { userApi } from '@/lib/api';
import { X } from 'lucide-react';

const PROFESSIONS = [
  { value: 'etudiant_infirmier',      fr: 'Étudiant en sciences infirmières', ar: 'طالب علوم التمريض' },
  { value: 'etudiant_infirmier_3eme', fr: 'Étudiant infirmier 3ème année',    ar: 'طالب تمريض السنة الثالثة' },
  { value: 'etudiant_medecine',       fr: 'Étudiant en médecine',             ar: 'طالب طب' },
  { value: 'etudiant_pharmacie',      fr: 'Étudiant en pharmacie',            ar: 'طالب صيدلة' },
  { value: 'infirmier_diplome',       fr: 'Infirmier diplômé',                ar: 'ممرض متخرج' },
  { value: 'aide_soignant',           fr: 'Aide-soignant',                    ar: 'مساعد تمريض' },
  { value: 'medecin',                 fr: 'Médecin',                          ar: 'طبيب' },
  { value: 'sage_femme',              fr: 'Sage-femme',                       ar: 'قابلة' },
  { value: 'technicien_labo',         fr: 'Technicien de laboratoire',        ar: 'تقني مخبر' },
  { value: 'autre',                   fr: 'Autre professionnel de santé',     ar: 'مهني صحة آخر' },
];

const WILAYAS = [
  'Hodh Ech Chargui','Hodh El Gharbi','Assaba','Gorgol','Brakna',
  'Trarza','Adrar','Dakhlet Nouadhibou','Tagant','Guidimaka',
  'Tiris Zemmour','Inchiri','Nouakchott Ouest','Nouakchott Nord','Nouakchott Sud',
];

interface Props {
  isAr: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileCompletionModal({ isAr, onClose, onSaved }: Props) {
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition text-sm text-gray-800';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

  async function handleSave() {
    setLoading(true);
    try {
      await userApi.updateMe({
        ...(gender ? { gender } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(wilaya ? { wilaya } : {}),
      });
      onSaved();
    } catch {
      // silent fail — non bloquant
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-extrabold text-gray-900">
              {isAr ? '👋 مرحباً بك !' : '👋 Bienvenue !'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isAr ? 'أكمل ملفك الشخصي لتحسين تجربتك' : 'Complétez votre profil pour une meilleure expérience'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Sexe */}
          <div>
            <label className={labelClass}>{isAr ? 'الجنس' : 'Sexe'}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'masculin', fr: 'Masculin', ar: 'ذكر' },
                { value: 'feminin',  fr: 'Féminin',  ar: 'أنثى' },
              ].map((o) => (
                <button key={o.value} type="button" onClick={() => setGender(o.value)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    gender === o.value
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  {isAr ? o.ar : o.fr}
                </button>
              ))}
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className={labelClass}>
              {isAr ? 'الهاتف' : 'Téléphone'}
              <span className="text-gray-400 font-normal text-xs ml-1">{isAr ? '(اختياري)' : '(optionnel)'}</span>
            </label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className={inputClass} placeholder="+222 XX XX XX" dir="ltr" />
          </div>

          {/* Wilaya */}
          <div>
            <label className={labelClass}>
              {isAr ? 'الولاية' : 'Wilaya'}
              <span className="text-gray-400 font-normal text-xs ml-1">{isAr ? '(اختياري)' : '(optionnel)'}</span>
            </label>
            <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className={`${inputClass} cursor-pointer`}>
              <option value="">{isAr ? 'اختر…' : 'Sélectionner…'}</option>
              {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-gray-400 transition font-medium">
            {isAr ? 'لاحقاً' : 'Plus tard'}
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {loading ? '…' : (isAr ? 'حفظ' : 'Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}
