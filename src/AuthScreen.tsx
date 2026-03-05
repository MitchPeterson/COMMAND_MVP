// src/AuthScreen.tsx
// Login / signup screen for COMMAND
// Shown when no active Supabase session is detected

import React, { useState } from 'react';
import { supabase } from './lib/supabase';

type AuthMode = 'choose' | 'signin' | 'signup';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reset = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, useHousehold's onAuthStateChange SIGNED_IN handler takes over
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, Supabase fires SIGNED_IN → useHousehold loads → no household → OnboardingFlow
  };

  // ── Choose screen (first thing user sees) ──────────
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">

          <img src="/Command_Logo.png" alt="Command" className="w-full mb-8" />

          <h1 className="text-[#F6F6F4] text-2xl font-semibold mb-2">
            Your household, under control.
          </h1>
          <p className="text-[#808084] text-sm mb-10 leading-relaxed">
            Command tracks everything your household is responsible for — insurance, legal, finances, home, and more.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => { reset(); setMode('signup'); }}
              className="w-full bg-[#C9A24D] hover:bg-[#b8913c] text-[#0F0F10] font-semibold rounded-xl py-4 transition-colors"
            >
              I'm new — create an account
            </button>

            <button
              onClick={() => { reset(); setMode('signin'); }}
              className="w-full bg-[#1C1D20] hover:bg-[#242528] border border-[#2a2b2e] hover:border-[#3a3b3e] text-[#F6F6F4] font-semibold rounded-xl py-4 transition-colors"
            >
              I have an account — sign in
            </button>
          </div>

          <p className="text-[#3a3b3e] text-xs mt-10">
            COMMAND · Household Operating System
          </p>
        </div>
      </div>
    );
  }

  // ── Sign In / Sign Up form ──────────────────────────
  const isSignUp = mode === 'signup';

  return (
    <div className="min-h-screen bg-[#0F0F10] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Back button */}
        <button
          onClick={() => { reset(); setMode('choose'); }}
          className="flex items-center gap-1.5 text-[#808084] hover:text-[#F6F6F4] text-sm mb-8 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <img src="/Command_Logo.png" alt="Command" className="w-full mb-8" />

        <h2 className="text-[#F6F6F4] text-xl font-semibold mb-1">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-[#808084] text-sm mb-8">
          {isSignUp
            ? 'You\'ll set up your household profile right after this.'
            : 'Sign in to access your Command dashboard.'}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 mb-5">
            <p className="text-[#ef4444] text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl px-4 py-3 mb-5">
            <p className="text-[#22c55e] text-sm">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-3 mb-6">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (isSignUp ? handleSignUp() : handleSignIn())}
            className="w-full bg-[#1C1D20] border border-[#2a2b2e] focus:border-[#C9A24D]/50 rounded-xl px-4 py-3.5 text-[#F6F6F4] text-sm placeholder-[#4a4b4e] outline-none transition-colors"
          />
          <input
            type="password"
            placeholder={isSignUp ? 'Create a password (8+ characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (isSignUp ? handleSignUp() : handleSignIn())}
            className="w-full bg-[#1C1D20] border border-[#2a2b2e] focus:border-[#C9A24D]/50 rounded-xl px-4 py-3.5 text-[#F6F6F4] text-sm placeholder-[#4a4b4e] outline-none transition-colors"
          />
        </div>

        <button
          onClick={isSignUp ? handleSignUp : handleSignIn}
          disabled={loading}
          className={`w-full font-semibold rounded-xl py-4 transition-all flex items-center justify-center gap-2 ${
            loading
              ? 'bg-[#1C1D20] text-[#4a4b4e] border border-[#2a2b2e] cursor-not-allowed'
              : 'bg-[#C9A24D] hover:bg-[#b8913c] text-[#0F0F10]'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#4a4b4e] border-t-[#808084] rounded-full animate-spin" />
              {isSignUp ? 'Creating account…' : 'Signing in…'}
            </>
          ) : (
            isSignUp ? 'Create account' : 'Sign in'
          )}
        </button>

        {/* Toggle mode */}
        <p className="text-center text-[#808084] text-sm mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { reset(); setMode(isSignUp ? 'signin' : 'signup'); }}
            className="text-[#C9A24D] hover:text-[#b8913c] font-medium transition-colors"
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>

      </div>
    </div>
  );
};

export default AuthScreen;
