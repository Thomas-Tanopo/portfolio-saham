import { create } from 'zustand';
import api from '../services/api';

export interface UserPermission {
  modul: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  nama: string;
  role: string;
  permissions: UserPermission[];
}

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  loading: true,

  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, loading: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, loading: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, loading: false });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null, loading: false });
      }
    } else {
      set({ loading: false });
    }
  },
}));
