// src/components/AuthScreen.tsx
// Login / Sign Up screen for COMMAND
// Handles email+password auth via Supabase

import { useState } from 'react';
import { supabase } from './lib/supabase';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setMessage({ text: 'Email and password required.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: 'Check your email to confirm your account.', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state change in useHousehold hook will handle redirect
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Authentication failed.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-[#C9A24D] text-xs tracking-[0.3em] font-medium mb-2">
            HOUSEHOLD OPERATING SYSTEM
          </div>
          <h1 className="text-white text-4xl font-bold tracking-tight">COMMAND</h1>
        </div>

        {/* Card */}
        <div className="bg-[#1C1D20] rounded-2xl border border-[#2a2b2e] p-8">
          <h2 className="text-white text-xl font-semibold mb-6">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[#808084] text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                className="w-full bg-[#0F0F10] border border-[#2a2b2e] rounded-lg px-4 py-3 text-white placeholder-[#404044] text-sm focus:outline-none focus:border-[#C9A24D] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[#808084] text-sm mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full bg-[#0F0F10] border border-[#2a2b2e] rounded-lg px-4 py-3 text-white placeholder-[#404044] text-sm focus:outline-none focus:border-[#C9A24D] transition-colors"
              />
            </div>

            {message && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                    : 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#C9A24D] hover:bg-[#b8913e] disabled:opacity-50 text-black font-semibold rounded-lg py-3 text-sm transition-colors"
            >
              {loading ? 'Working…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <span className="text-[#808084] text-sm">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setMessage(null);
              }}
              className="text-[#C9A24D] text-sm hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-[#404044] text-xs mt-6">
          Run your household with clarity and confidence.
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
