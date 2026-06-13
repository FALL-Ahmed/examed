// IDs des nouveaux thèmes/sous-thèmes (importés le 2026-06-13)
// À supprimer quand le badge "Nouveau" ne sera plus nécessaire

export const NEW_THEME_IDS = new Set([
  'cmqbmrtmq0000ufl4mmnpc3eb', // CAS CLINIQUE
]);

export const NEW_SUBTHEME_IDS = new Set([
  // Obstetrique — nouveaux sous-thèmes
  'cmqbmru0t0002ufl4qayatmrb', // SOINS NÉONATAUX ET RÉANIMATION
  'cmqbmru790004ufl4hfbs7h9d', // LE CORDON OMBILICAL
  'cmqbmrubd0006ufl4d7rfq3df', // LA GROSSESSE GÉMELLAIRE
  'cmqbmrufk0008ufl4r7olgnw1', // LE DÉCLENCHEMENT DU TRAVAIL ET LA MATURATION CERVICALE
  'cmqbmrunu000cufl44zr46axv', // LA STAGNATION DU TRAVAIL
  'cmqbmrvpg000uufl4qyxywwj6', // Epreuve utérine
  'cmqbmrusa000eufl4kulkxl55', // LES PRÉSENTATIONS FŒTALES
  'cmqbmruwe000gufl4ugx7b08l', // LA TOCOLYSE ET LA MAP
  'cmqbmrvtm000wufl4um5rzzcp', // CORTICOTHÉRAPIE ANTÉNATALE
  'cmqbmrv0i000iufl4ptpqh1f0', // RUPTURE PRÉMATURÉE DES MEMBRANES (RPM)
  'cmqbmrv4m000kufl42t28xvll', // LE LIQUIDE AMNIOTIQUE
  'cmqbmrv8r000mufl4ihbldj4e', // LE PLACENTA
  'cmqbmrvcx000oufl4uggwbgzt', // VACCINATIONS ET GROSSESSE
  // Gynecologie — nouveau sous-thème
  'cmqbmrvh3000qufl4calhoz0z', // PRÉVENTION DU CANCER DU COL DE L'UTÉRUS
]);

export function newLabel(lang: string): string {
  return lang === 'ar' ? ' (جديد)' : ' (Nouveau)';
}
