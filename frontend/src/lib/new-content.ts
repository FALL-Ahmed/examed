// IDs des nouveaux thèmes/sous-thèmes (importés le 2026-06-13)
// À supprimer quand le badge "Nouveau" ne sera plus nécessaire

export const NEW_THEME_IDS = new Set([
  'cmqbmrtmq0000ufl4mmnpc3eb', // CAS CLINIQUE (FR)
  'cmqbp9c180000a9wiu0vprkay', // حالة سريرية (AR)
  'cmqc5okpa000011gggo5atvyu', // SOINS NÉONATAUX ET RÉANIMATION (FR, thème indépendant)
  'cmqc5t2tb0000dd0tpcvjamh4', // رعاية حديثي الولادة والإنعاش (AR, thème indépendant)
  'cmqdohqpl0000sj35udqn2gdg', // CAS CLINIQUE INFIRMIER (FR, importé le 2026-06-14)
  'cmqdoxdnx000014l3gvei98v1', // حالة سريرية INFIRMIER (AR, importé le 2026-06-14)
]);

export const NEW_SUBTHEME_IDS = new Set([
  // SOINS NÉONATAUX ET RÉANIMATION — thèmes indépendants FR + AR
  'cmqc5okxz000211ggmnk9ery9', // SOINS NÉONATAUX ET RÉANIMATION (sous-thème FR)
  'cmqc5t2zq0002dd0tczmgx3rv', // رعاية حديثي الولادة والإنعاش (sous-thème AR)
  // Obstetrique FR — nouveaux sous-thèmes
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
  // Gynecologie FR — nouveau sous-thème
  'cmqbmrvh3000qufl4calhoz0z', // PRÉVENTION DU CANCER DU COL DE L'UTÉRUS
  // طب التوليد AR — nouveaux sous-thèmes
  'cmqbp9cga0004a9wil47vwklt', // الحبل السري
  'cmqbp9ckh0006a9wij4f43sjx', // الحمل المتعدد
  'cmqbp9con0008a9widd0k98d6', // تحفيز المخاض ونضج عنق الرحم
  'cmqbp9csu000aa9wi9ikbfc7q', // المناورات في طب التوليد
  'cmqbp9cxt000ca9wivl2nbsag', // تعثر/توقف المخاض
  'cmqbp9d1x000ea9widg43anif', // المخاض التجريبي
  'cmqbp9d62000ga9wixb54ficz', // المجيئات الجنينية
  'cmqbp9da7000ia9wimql2lius', // تثبيط المخاض في حالات التهديد بالولادة المبكرة
  'cmqbp9dee000ka9with5gig8n', // مستويات الخداج والوقاية
  'cmqbp9djg000ma9wifwk6mcwd', // العلاج بالكورتيكوستيرويدات قبل الولادة
  'cmqbp9dnn000oa9wit5y45l9i', // تمزق الأغشية الباكر
  'cmqbp9drt000qa9widhq2dv9y', // السائل الأمنيوسي
  'cmqbp9dvx000sa9wiours0z6d', // المشيمة
  'cmqbp9e01000ua9wiyv9wu9n1', // أمراض النساء - اللقاحات
  // أمراض النساء AR — nouveau sous-thème
  'cmqbp9e4a000wa9wiqd7kczwb', // سرطان عنق الرحم
  // حالة سريرية AR — sous-thèmes
  'cmqbp9e8n000ya9wiwq85sj1t', // متابعة الحمل الطبيعي
  'cmqbp9ecs0010a9wijhwsdgkd', // مضاعفات الثلث الأول
  'cmqbp9ehf0012a9wis6l7zhcr', // مضاعفات الثلث الثالث
  'cmqbp9elx0014a9wilbb5bssu', // العمل والولادة
  'cmqbp9eqd0016a9wi3ypoxdk2', // النفاس والخلاص
  'cmqbp9euj0018a9wi7kogn3cs', // العدوى، التحفيز والمناورات
]);

export function newLabel(lang: string): string {
  return lang === 'ar' ? ' (جديد)' : ' (Nouveau)';
}
