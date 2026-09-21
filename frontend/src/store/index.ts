import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'faculty' | 'department_admin' | 'lab_manager' | 'club_org' | 'campus_admin';
  department_id: string | null;
  department_name?: string;
  reliability_score?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('cl_token', token);
        localStorage.setItem('cl_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('cl_token');
        localStorage.removeItem('cl_user');
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      }))
    }),
    { name: 'campusloop-auth', partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }) }
  )
);

// Notification store
interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrement: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  reset: () => set({ unreadCount: 0 })
}));
