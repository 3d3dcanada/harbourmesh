import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccountSession, AccountSessionEnvelope } from '@/lib/account-session';

interface AuthState {
  session: AccountSessionEnvelope | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
  checkSession: () => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

function isSessionValid(session: AccountSessionEnvelope | null): boolean {
  if (!session) return false;
  return Date.parse(session.session.expiresAt) > Date.now();
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json() as { ok: boolean; session?: AccountSession; error?: string };
          if (!data.ok || !data.session) {
            set({ isLoading: false, error: data.error || 'Login failed' });
            return;
          }
          const envelope: AccountSessionEnvelope = {
            savedAt: new Date().toISOString(),
            session: data.session,
          };
          set({ session: envelope, isAuthenticated: true, isLoading: false, error: null });
        } catch {
          set({ isLoading: false, error: 'Network error. Please try again.' });
        }
      },

      register: async (email, displayName, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, displayName, password }),
          });
          const data = await res.json() as { ok: boolean; session?: AccountSession; error?: string };
          if (!data.ok || !data.session) {
            set({ isLoading: false, error: data.error || 'Registration failed' });
            return;
          }
          const envelope: AccountSessionEnvelope = {
            savedAt: new Date().toISOString(),
            session: data.session,
          };
          set({ session: envelope, isAuthenticated: true, isLoading: false, error: null });
        } catch {
          set({ isLoading: false, error: 'Network error. Please try again.' });
        }
      },

      logout: () => {
        set({ session: null, isAuthenticated: false, error: null });
      },

      checkSession: () => {
        const { session } = get();
        if (!isSessionValid(session)) {
          set({ session: null, isAuthenticated: false });
        } else {
          set({ isAuthenticated: true });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'harbormesh-auth',
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = isSessionValid(state.session);
        }
      },
    },
  ),
);
