import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Anchor, LogIn, UserPlus, Loader2 } from 'lucide-react';

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await login(email, password);
    } else {
      await register(email, displayName, password);
    }
  };

  const toggleMode = () => {
    clearError();
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-600 mb-4">
            <Anchor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">HarborMesh</h1>
          <p className="text-slate-400 mt-1">Vessel management system</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-4">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-1">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Captain Ken"
                  autoComplete="name"
                  minLength={2}
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder={mode === 'register' ? '12 characters minimum' : ''}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 12 : 1}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          3D3D &middot; hb.3d3d.ca
        </p>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
