import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

// Empreinte stable via FingerprintJS (résiste au vidage du cache/localStorage)
const fpReady: Promise<string> = typeof window === 'undefined'
  ? Promise.resolve('server')
  : (async () => {
      try {
        const FP = await import('@fingerprintjs/fingerprintjs');
        const fp = await FP.default.load();
        const result = await fp.get();
        localStorage.setItem('_did', result.visitorId);
        return result.visitorId;
      } catch {
        let id = localStorage.getItem('_did');
        if (!id) { id = `${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem('_did', id); }
        return id!;
      }
    })();

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter token + fingerprint dans chaque requête
api.interceptors.request.use(async (config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Device-ID'] = await fpReady;
  return config;
});

// Auto-refresh si 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, {
            headers: { 'X-Device-ID': await fpReady },
          });
          Cookies.set('access_token', data.accessToken, { expires: 1 });
          Cookies.set('refresh_token', data.refreshToken, { expires: 7 });
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  register: (data: FormData | any) => api.post('/auth/register', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  login: (data: any) => api.post('/auth/login', data),
  verifyDevice: (data: { email: string; verificationCode: string; deviceFingerprint: string; deviceName?: string }) =>
    api.post('/auth/devices/verify', data),
  resendVerificationCode: (data: { email: string; deviceFingerprint: string }) =>
    axios.post(`${API_URL}/auth/devices/resend-code`, data),
  logout: () => api.post('/auth/logout'),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id: string) => api.delete(`/auth/sessions/${id}`),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
  checkGroupInvite: (email: string) => api.get(`/auth/check-invite?email=${encodeURIComponent(email)}`),
  groupAccess: (email: string) => api.post('/auth/group-access', { email }),
  groupSetup: (data: { token: string; fullName: string; password: string; gender?: string; phone?: string; wilaya?: string; profession?: string }) => api.post('/auth/group-setup', data),
};

// User
export const userApi = {
  me: () => api.get('/users/me'),
  stats: () => api.get('/users/me/stats'),
  myPayments: () => api.get('/payments/me'),
  trackPdf: (filename: string, source = 'app') => api.post('/users/track-pdf', { filename, source }),
  updateMe: (data: { gender?: string; phone?: string; wilaya?: string; profession?: string }) => api.patch('/users/me', data),
};

// Themes
export const themesApi = {
  all: (lang?: string) => api.get('/themes', lang ? { params: { lang } } : undefined),
};

// Questions
export const publicApi = {
  themes: (lang?: string) => axios.get(`${API_URL}/themes/public`, lang ? { params: { lang } } : {}),
  freePractice: (themeId: string, themeName: string, count: number, lang: string, subThemeId?: string) =>
    axios.get(`${API_URL}/questions/free-trial/practice`, { params: { themeId, themeName, count, lang, subThemeId } }),
  nationalStats: (score: number, themeId?: string, subThemeId?: string) =>
    axios.get(`${API_URL}/stats/national`, { params: { score, themeId, subThemeId } }),
  freeTrial: (theme: string, lang: string) => axios.get(`${API_URL}/questions/free-trial`, { params: { theme, lang } }),
  trackFreeTrialEvent: (data: { sessionId: string; theme: string; lang: string; source: string; questionN: number; isCorrect: boolean }) =>
    axios.post(`${API_URL}/questions/free-trial/event`, data).catch(() => {}),
  saveFreeTrialLead: (data: { sessionId: string; phone: string; theme: string; lang: string; source: string }) =>
    axios.post(`${API_URL}/questions/free-trial/lead`, data).catch(() => {}),
  trackFreePracticeEvent: (data: {
    sessionId: string;
    themeId?: string;
    themeName: string;
    subThemeId?: string;
    subThemeName?: string;
    lang: string;
    eventType: string;
    questionN?: number;
    isCorrect?: boolean;
    count?: number;
  }) => axios.post(`${API_URL}/questions/free-trial/practice-event`, data).catch(() => {}),
};

export const questionsApi = {
  practice: (params?: any) => api.get('/questions/practice', { params }),
  mistakes: () => api.get('/questions/mistakes'),
  favorites: () => api.get('/questions/favorites'),
  favoriteIds: () => api.get('/questions/favorites/ids'),
  toggleFavorite: (id: string) => api.post(`/questions/${id}/favorite`),
};

// Attempts
export const attemptsApi = {
  start: (data: any) => api.post('/attempts/start', data),
  answer: (id: string, data: any) => api.post(`/attempts/${id}/answer`, data),
  finish: (id: string) => api.post(`/attempts/${id}/finish`),
  review: (id: string) => api.get(`/attempts/${id}/review`),
  history: () => api.get('/attempts/history/me'),
  weakTheme: () => api.get('/attempts/weak-theme'),
  themeProgress: (themeId?: string, subThemeId?: string, excludeId?: string) =>
    api.get('/attempts/theme-progress', { params: { themeId, subThemeId, excludeId } }),
};

// Payments
export const paymentsApi = {
  submit: (data: FormData) => api.post('/payments', data, {
    headers: { 'Content-Type': undefined },
  }),
  myPayments: () => api.get('/payments/me'),
};

export const statsApi = {
  myRank: () => api.get('/stats/my-rank'),
};

// Public settings
export const settingsApi = {
  price: () => api.get('/settings/price'),
  operators: () => api.get('/settings/operators'),
  whatsapp: () => api.get('/settings/whatsapp'),
  contact: () => api.get('/settings/contact'),
  pricing: () => api.get('/settings/pricing'),
  promo: () => api.get('/settings/promo'),
};

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params?: any) => api.get('/admin/users', { params }),
  toggleUser: (id: string) => api.put(`/admin/users/${id}/toggle`),
  resetSubscription: (id: string) => api.put(`/admin/users/${id}/reset-subscription`),
  changePassword: (id: string, password: string) => api.put(`/admin/users/${id}/password`, { password }),
  changeEmail: (id: string, email: string) => api.put(`/admin/users/${id}/email`, { email }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  revokeDevice: (deviceId: string) => api.delete(`/admin/devices/${deviceId}`),
  questions: (params?: any) => api.get('/admin/questions', { params }),
  updateQuestion: (id: string, data: any) => api.put(`/admin/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete(`/admin/questions/${id}`),
  uploadQuestionImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/admin/questions/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteAllQuestions: () => api.delete('/admin/questions'),
  deleteAllThemes: () => api.delete('/admin/themes'),
  groups: () => api.get('/admin/groups'),
  pdfDownloads: () => api.get('/admin/pdf-downloads'),
  pendingPayments: () => api.get('/admin/payments/pending'),
  validatePayment: (id: string, gifted = false) => api.post(`/admin/payments/${id}/validate`, { gifted }),
  rejectPayment: (id: string, reason?: string) => api.post(`/admin/payments/${id}/reject`, { reason }),
  markPaymentGifted: (id: string) => api.post(`/admin/payments/${id}/mark-gifted`),
  previewPdf: (file: File, lang = 'fr') => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/pdf/preview?lang=${lang}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  importPdf: (file: File, lang = 'fr', target = 'INFIRMIER') => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/pdf/import?lang=${lang}&target=${target}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  previewText: (text: string) => api.post('/pdf/text-preview', { text }),
  importText: (text: string, target = 'INFIRMIER') => api.post('/pdf/text-import', { text, target }),
  previewArText: (text: string) => api.post('/pdf/ar-text-preview', { text }),
  importArText: (text: string, target = 'INFIRMIER') => api.post('/pdf/ar-text-import', { text, target }),
  previewJson: (json: any) => api.post('/pdf/json-preview', json),
  importJson: (json: any, target = 'INFIRMIER') => api.post('/pdf/json-import', { ...json, target }),
  analytics: () => api.get('/admin/analytics'),
  getSettings: () => api.get('/admin/settings'),
  setSetting: (key: string, value: string) => api.put(`/admin/settings/${key}`, { value }),
  grantPremium: (id: string, days: number) => api.put(`/admin/users/${id}/grant-premium`, { days }),
  bulkGrantPremium: (ids: string[], days: number) => api.post('/admin/users/bulk-grant-premium', { ids, days }),
  leaderboard: (sortBy?: string) => api.get('/admin/leaderboard', { params: { sortBy } }),
  sessions: () => api.get('/admin/sessions'),
  freeTrialStats: (params?: { startDate?: string; endDate?: string; compareStart?: string; compareEnd?: string }) =>
    api.get('/admin/free-trial-stats', { params }),
  freePracticeStats: (params?: { startDate?: string; endDate?: string }) => api.get('/admin/free-practice-stats', { params }),
};

export const examenBlancApi = {
  current: () => axios.get(`${API_URL}/examen-blanc/current`),
  register: (data: { nom: string; prenom: string; telephone: string; ville: string; examenBlancId: string; lang: string }) =>
    axios.post(`${API_URL}/examen-blanc/register`, data),
  getSession: (sessionId: string) => axios.get(`${API_URL}/examen-blanc/session/${sessionId}`),
  submitAnswer: (sessionId: string, data: { questionId: string; reponse: string; tempsReponse?: number }) =>
    axios.post(`${API_URL}/examen-blanc/session/${sessionId}/answer`, data).catch(() => {}),
  finish: (sessionId: string, tabSwitches: number) =>
    axios.post(`${API_URL}/examen-blanc/session/${sessionId}/finish`, { tabSwitches }),
  results: (sessionId: string) => axios.get(`${API_URL}/examen-blanc/session/${sessionId}/results`),
  leaderboard: (id?: string) => axios.get(`${API_URL}/examen-blanc/leaderboard`, id ? { params: { id } } : {}),
  adminSessions: () => api.get('/examen-blanc/admin/sessions'),
  adminCreateSession: (data: any) => api.post('/examen-blanc/admin/sessions', data),
  adminGetStats: (id: string, lang?: 'fr' | 'ar') => api.get(`/examen-blanc/admin/sessions/${id}/stats`, lang ? { params: { lang } } : {}),
  adminUpdateSession: (id: string, data: any) => api.put(`/examen-blanc/admin/sessions/${id}`, data),
  adminParticipants: () => api.get('/examen-blanc/admin/participants'),
  adminAppUsers: () => api.get('/examen-blanc/admin/app-users'),
  recover: (telephone: string) => axios.post(`${API_URL}/examen-blanc/recover`, { telephone }),
  adminTestSession: (examenBlancId: string, lang: 'fr' | 'ar') =>
    api.post('/examen-blanc/admin/test-session', { examenBlancId, lang }),
};

export const pushApi = {
  vapidKey: () => api.get('/push/vapid-public-key'),
  subscribe: (sub: { endpoint: string; p256dh: string; auth: string }) => api.post('/push/subscribe', sub),
  unsubscribe: (endpoint: string) => api.delete('/push/unsubscribe', { data: { endpoint } }),
};
