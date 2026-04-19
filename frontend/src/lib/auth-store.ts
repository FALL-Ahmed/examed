import { create } from 'zustand';
import Cookies from 'js-cookie';
import { authApi, userApi } from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'FREE' | 'PREMIUM' | 'ADMIN';
  subscriptionEnd?: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login({ email, password });
      Cookies.set('access_token', data.accessToken, { expires: 1 });
      Cookies.set('refresh_token', data.refreshToken, { expires: 7 });
      set({ user: data.user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    set({ user: null });
  },

  loadUser: async () => {
    const token = Cookies.get('access_token');
    if (!token) return;
    try {
      const { data } = await userApi.me();
      set({ user: data });
    } catch {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
    }
  },
}));
