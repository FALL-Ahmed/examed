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
]);

export function newLabel(lang: string): string {
  return lang === 'ar' ? ' (جديد)' : ' (Nouveau)';
}
