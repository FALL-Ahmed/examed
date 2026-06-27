// IDs des nouveaux thèmes/sous-thèmes
// À supprimer quand le badge "Nouveau" ne sera plus nécessaire

export const NEW_THEME_IDS = new Set([
  // Infirmier FR — importés le 2026-06-27
  '57ca7cd9-acd0-428e-8eb3-cb2ea054297e', // SECOURISME
  '1c11b5af-ae8a-4cd1-a43d-8d084d1a259b', // COMMUNICATION ET ÉDUCATION POUR LA SANTÉ
  '90ef574e-2b48-41ee-85cf-70014611d863', // PNEUMOLOGIE
  '2c313627-a86b-49d6-b281-129645af0192', // VIH
  '2e490f39-20cc-4e06-9823-b9e6c1f36ac3', // SANTÉ PUBLIQUE
  // Infirmier AR — importés le 2026-06-27
  '1977c708-1193-4b9d-8fd4-979634ac69ee', // الإسعاف والإنعاش
  '02a1f88e-bb22-46a9-9b45-3ef92a5b2614', // التواصل والتربية الصحية
  '5d8325c9-d553-46f7-a69f-4c39dd2c11b5', // أمراض الجهاز التنفسي
  'ac74b415-6cab-41f6-a6bf-57912dbbefca', // فيروس نقص المناعة البشرية
  'cmqbmrtmq0000ufl4mmnpc3eb', // CAS CLINIQUE (FR)
  'cmqbp9c180000a9wiu0vprkay', // حالة سريرية (AR)
  'cmqc5okpa000011gggo5atvyu', // SOINS NÉONATAUX ET RÉANIMATION (FR, thème indépendant)
  'cmqc5t2tb0000dd0tpcvjamh4', // رعاية حديثي الولادة والإنعاش (AR, thème indépendant)
  'cmqdohqpl0000sj35udqn2gdg', // CAS CLINIQUE INFIRMIER (FR, importé le 2026-06-14)
  'cmqdoxdnx000014l3gvei98v1', // حالة سريرية INFIRMIER (AR, importé le 2026-06-14)
  // Biologiste — importé le 2026-06-19 (visibles uniquement si switch BIO_NEW_CONTENT_VISIBLE=true)
  'cmqkqd0lx0000147e54cjwhn0', // BIOLOGIE MOLÉCULAIRE
  'cmqkqd8da004t147e70b4se53', // TECHNIQUES DE BIOLOGIE MOLÉCULAIRE
  'cmqkqdh8b00as147e3vorzan3', // VIROLOGIE ET DIAGNOSTIC
]);

export const NEW_SUBTHEME_IDS = new Set([
  // Infirmier FR — sous-thèmes importés le 2026-06-27
  'c14cbb93-c21e-4024-a094-e3c94a9a3b44', // RÉANIMATION INTRA-HOSPITALIÈRE
  '705f3cd2-a10e-48cd-9882-fc3d83ecf007', // ALGORITHME RCP AVANCÉE - ALS
  'fdf83868-331c-4c04-8803-8e2016c9ab9c', // COMMUNICATION EN SOINS INFIRMIERS
  '6ede807b-e778-4d98-9ba3-a0ec675b3176', // ERGONOMIE ET MANUTENTION
  '49172608-cc9f-4198-bb63-3a8ec9d04061', // DÉTRESSE RESPIRATOIRE ET OXYGÉNOTHÉRAPIE
  '669f93fa-f49d-404a-be5c-4b5d83f5c54f', // L'ASTHME
  '8d0e4949-4a3a-43b1-b094-027572975815', // LA BPCO
  '7eee842c-dd7a-4567-83a8-df5da461bc6c', // ACCIDENTS D'EXPOSITION AUX LIQUIDES BIOLOGIQUES (AELB/AES)
  '1db0cd2c-7ad2-42b1-ad34-fbba3436936d', // ÉPIDÉMIOLOGIE
  'cd1db0f8-2c88-40cc-ae33-29692163e95b', // INFECTIONS NÉONATALES BACTÉRIENNES
  '81cce21a-c16c-40cf-b130-1d65929b6561', // DÉSHYDRATATION AIGUË DE L'ENFANT
  'ad2b7605-b2f6-46f4-8d6f-eecf94665563', // LE SYNDROME CORONARIEN AIGU (SCA)
  // Infirmier AR — sous-thèmes importés le 2026-06-27
  'f9a31ede-79d0-42e4-b1bb-e055cbc9db8b', // الإنعاش القلبي الرئوي داخل المستشفى
  '5a49a3bc-21be-4d2f-94f3-b7e62cb3d5c6', // خوارزمية دعم الحياة المتقدم - ALS
  '62bacc32-acc9-40df-b0a8-3ad785c81a62', // التواصل في الرعاية التمريضية
  '1cf21fe2-7670-4f13-9d1b-c67185bc1ad5', // الأرغونوميا والمناولة
  'ad4e18a8-e8af-47a9-a02c-2d151ec4c305', // الضائقة التنفسية والأوكسجين العلاجي
  'cdbe3a34-5582-4169-8ce7-9eb7602d7894', // حوادث التعرض للدم والوقاية - مقدمة
  '6263996a-b3fa-4e6b-a84e-7ec776b68bd9', // الربو
  'ef3ce11e-11e5-4041-a086-213283f45123', // القصور الرئوي المزمن - BPCO
  '1bac75c3-05e0-48d3-8a85-c6e71c97dd1c', // حوادث التعرض للدم - AES
  'b8210deb-4173-496c-89e9-7e068deb5b52', // الوقاية من انتقال السيدا من الأم إلى الطفل - PTME
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
  // Biologiste — sous-thèmes importés le 2026-06-19
  'cmqkqd13u0002147ervc2nlzi', // Structures et propriétés des acides nucléiques
  'cmqkqd2yw0018147eqz2c87dy', // La réplication de l'ADN
  'cmqkqd4jt002e147eumv0ulle', // Transcription
  'cmqkqd5i10030147eng0yy1wd', // Maturation des ARN
  'cmqkqd6gf003m147eyghbfpic', // La traduction
  'cmqkqd7eb0048147ez05ap3ma', // Régulation de l'expression génétique
  'cmqkqd8oi004v147ebs6qsxps', // Extraction et purification des acides nucléiques
  'cmqkqd9xu005r147eog99tioo', // Dosage des acides nucléiques
  'cmqkqdavr006d147e3leol8x3', // Électrophorèse
  'cmqkqdbtr006z147ebni7h9j6', // Marquage des acides nucléiques
  'cmqkqdcih007b147elououhfx', // Hybridation des acides nucléiques
  'cmqkqddpk0085147ek35c7ita', // PCR
  'cmqkqdfnr009n147e7p4clhnc', // Génie génétique
  'cmqkqdhje00au147eut78e8pe', // Nature, structure et stabilité des virus
  'cmqkqdisj00bq147eobbgkn4q', // Qualité et caractéristiques des tests diagnostiques
  'cmqkqdjeu00c2147e86jfx3qh', // Techniques de détection directe et moléculaire
]);

export function newLabel(lang: string): string {
  return lang === 'ar' ? ' (جديد)' : ' (Nouveau)';
}
