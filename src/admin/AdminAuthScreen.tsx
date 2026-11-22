import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import type { AdminUserPublic } from '../types/clinic';

export interface AuthSession {
  token: string;
  exp: number;
  user: AdminUserPublic;
}

export function AdminAuthScreen({
  onAuthenticated,
  onBackPublic,
}: {
  onAuthenticated: (session: AuthSession) => void;
  onBackPublic: () => void;
}) {
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'bootstrap' | 'forgot' | 'two-step'>('login');

  const [name, setName] = useState('Vaid Dr. Jashan Sandhu');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((data: { needsBootstrap?: boolean }) => {
        const needs = Boolean(data.needsBootstrap);
        setNeedsBootstrap(needs);
        setMode(needs ? 'bootstrap' : 'login');
      })
      .catch(() => {
        setNeedsBootstrap(false);
        setMode('login');
      });
  }, []);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as Partial<AuthSession> & { error?: string };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error || 'Setup failed.');
        return;
      }
      onAuthenticated({ token: data.token, exp: data.exp || Date.now() + 43200000, user: data.user });
    } catch {
      setError('Unable to reach clinic server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as Partial<AuthSession> & {
        error?: string;
        requiresTwoStep?: boolean;
        challengeId?: string;
        previewHint?: string;
      };
      if (!res.ok) {
        setError(data.error || 'Sign in failed.');
        return;
      }
      if (data.requiresTwoStep && data.challengeId) {
        setChallengeId(data.challengeId);
        setHint(data.previewHint || '');
        setMode('two-step');
        return;
      }
      if (data.token && data.user) {
        onAuthenticated({ token: data.token, exp: data.exp || Date.now() + 43200000, user: data.user });
      }
    } catch {
      setError('Unable to reach clinic server.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-two-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code }),
      });
      const data = (await res.json()) as Partial<AuthSession> & { error?: string };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error || 'Verification failed.');
        return;
      }
      onAuthenticated({ token: data.token, exp: data.exp || Date.now() + 43200000, user: data.user });
    } catch {
      setError('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; previewCode?: string };
      setMessage(
        data.previewCode
          ? `${data.message} (Dev preview code: ${data.previewCode})`
          : data.message || 'Reset code sent.'
      );
    } catch {
      setError('Could not request reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || 'Reset failed.');
        return;
      }
      setMessage(data.message || 'Password updated.');
      setMode('login');
      setPassword('');
    } catch {
      setError('Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE2] text-[#12201A] flex flex-col justify-center px-5 py-12">
      <div className="max-w-md w-full mx-auto">
        <button type="button" onClick={onBackPublic} className="btn-secondary mb-6">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Public Clinic Site</span>
        </button>

        <div className="clinic-card p-7 sm:p-9 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[#0E3B26] t-14 font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-[#C9A24B]" aria-hidden="true" />
              <span>Khushdil Clinic Admin</span>
            </div>
            <h1 className="font-serif t-28 font-medium">
              {mode === 'bootstrap'
                ? 'First-Run Owner Setup'
                : mode === 'forgot'
                ? 'Reset Password'
                : mode === 'two-step'
                ? '2-Step Verification'
                : 'Clinic Dashboard Sign In'}
            </h1>
            <p className="t-14 text-[#12201A]/75 mt-1">
              {mode === 'bootstrap'
                ? 'Create the primary Owner login for Vaid Dr. Jashan Sandhu.'
                : mode === 'two-step'
                ? 'Enter the 6-digit verification code sent to your clinic address.'
                : 'Sessions expire automatically after 12 hours.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-[#C46A3C]/15 border border-[#C46A3C] t-14 font-bold text-[#12201A]">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3.5 rounded-xl bg-[#3E7A4A]/15 border border-[#3E7A4A] t-14 font-bold text-[#0E3B26]">
              {message}
            </div>
          )}

          {needsBootstrap === null ? (
            <p className="t-14 text-[#12201A]/65">Checking clinic setup...</p>
          ) : mode === 'bootstrap' ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div>
                <label className="block t-14 font-bold mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                />
              </div>
              <div>
                <label className="block t-14 font-bold mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vaid@khushdilclinic.in"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                />
              </div>
              <div>
                <label className="block t-14 font-bold mb-1">Choose Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>{loading ? 'Creating Owner Account...' : 'Create Owner & Open Dashboard'}</span>
              </button>
            </form>
          ) : mode === 'two-step' ? (
            <form onSubmit={handleTwoStep} className="space-y-4">
              {hint && <p className="t-14 text-[#3E7A4A] font-bold">{hint}</p>}
              <div>
                <label className="block t-14 font-bold mb-1">6-Digit Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 tracking-widest text-lg font-bold"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="t-14 font-bold text-[#12201A]/75 underline cursor-pointer"
              >
                Back to sign in
              </button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label className="block t-14 font-bold mb-1">Clinic Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                  />
                  <button
                    type="button"
                    onClick={handleRequestReset}
                    disabled={loading || !email}
                    className="btn-secondary shrink-0 px-4"
                  >
                    Send Code
                  </button>
                </div>
              </div>
              <div>
                <label className="block t-14 font-bold mb-1">Reset Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                />
              </div>
              <div>
                <label className="block t-14 font-bold mb-1">New Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                <span>{loading ? 'Updating...' : 'Reset Password'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="t-14 font-bold text-[#12201A]/75 underline cursor-pointer"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block t-14 font-bold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                />
              </div>
              <div>
                <label className="block t-14 font-bold mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </button>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMessage('');
                    setMode('forgot');
                  }}
                  className="t-14 font-bold text-[#0E3B26] underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
