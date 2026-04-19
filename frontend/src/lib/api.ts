import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

// Générer un deviceId stable côté client
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('_did');
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('_did', id);
  }
  return id;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter token + deviceId dans chaque requête
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Device-ID'] = getDeviceId();
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
            headers: { 'X-Device-ID': getDeviceId() },
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
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id: string) => api.delete(`/auth/sessions/${id}`),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
};

// User
export const userApi = {
  me: () => api.get('/users/me'),
  stats: () => api.get('/users/me/stats'),
};

// Themes
export const themesApi = {
  all: () => api.get('/themes'),
};

// Questions
export const questionsApi = {
  practice: (params?: any) => api.get('/questions/practice', { params }),
  mistakes: () => api.get('/questions/mistakes'),
};

// Attempts
export const attemptsApi = {
  start: (data: any) => api.post('/attempts/start', data),
  answer: (id: string, data: any) => api.post(`/attempts/${id}/answer`, data),
  finish: (id: string) => api.post(`/attempts/${id}/finish`),
  review: (id: string) => api.get(`/attempts/${id}/review`),
  history: () => api.get('/attempts/history/me'),
};

// Payments
export const paymentsApi = {
  submit: (data: any) => {
    const isFormData = data instanceof FormData;
    return api.post('/payments', data, {
      headers: isFormData ? {} : { 'Content-Type': 'application/json' }
    });
  },
  myPayments: () => api.get('/payments/me'),
};

// Public settings
export const settingsApi = {
  price: () => api.get('/settings/price'),
  operators: () => api.get('/settings/operators'),
};

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params?: any) => api.get('/admin/users', { params }),
  toggleUser: (id: string) => api.put(`/admin/users/${id}/toggle`),
  questions: (params?: any) => api.get('/admin/questions', { params }),
  updateQuestion: (id: string, data: any) => api.put(`/admin/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete(`/admin/questions/${id}`),
  pendingPayments: () => api.get('/admin/payments/pending'),
  validatePayment: (id: string) => api.post(`/admin/payments/${id}/validate`),
  rejectPayment: (id: string, reason?: string) => api.post(`/admin/payments/${id}/reject`, { reason }),
  previewPdf: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/pdf/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  importPdf: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/pdf/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  previewText: (text: string) => api.post('/pdf/text-preview', { text }),
  importText: (text: string) => api.post('/pdf/text-import', { text }),
  getSettings: () => api.get('/admin/settings'),
  setSetting: (key: string, value: string) => api.put(`/admin/settings/${key}`, { value }),
};
