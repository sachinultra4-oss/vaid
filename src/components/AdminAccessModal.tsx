import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';
import type { AuthSession } from '../admin/AdminAuthScreen';

export function AdminAccessModal({
  open,
  onClose,
  onAuthenticated,
  onOpenFullAuth,
}: {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: AuthSession) => void;
  onOpenFullAuth: () => void;
}) {
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'bootstrap' | 'two-step'>('login');
  const [showEmailField, setShowEmailField] = useState(false);

  const [name, setName] = useState('Vaid Dr. Jashan Sandhu');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setPassword('');
    setCode('');
    setShowPassword(false);
    setNeedsBootstrap(null);

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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, mode, onClose]);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: showEmailField ? email.trim() : '',
          password,
        }),
      });
      const data = (await res.json()) as Partial<AuthSession> & {
        error?: string;
        requiresTwoStep?: boolean;
        challengeId?: string;
        previewHint?: string;
      };
      if (!res.ok) {
        setError(data.error || 'Incorrect password.');
        return;
      }
      if (data.requiresTwoStep && data.challengeId) {
        setChallengeId(data.challengeId);
        setHint(data.previewHint || '');
        setMode('two-step');
        return;
      }
      if (data.token && data.user) {
        onAuthenticated({
          token: data.token,
          exp: data.exp || Date.now() + 43200000,
          user: data.user,
        });
      }
    } catch {
      setError('Unable to reach clinic server.');
    } finally {
      setLoading(false);
    }
  };

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
      onAuthenticated({
        token: data.token,
        exp: data.exp || Date.now() + 43200000,
        user: data.user,
      });
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
      onAuthenticated({
        token: data.token,
        exp: data.exp || Date.now() + 43200000,
        user: data.user,
      });
    } catch {
      setError('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E3B26]/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-access-title"
        className="w-full max-w-md rounded-2xl bg-[#FAF7EF] text-[#12201A] border border-[#C9A24B]/45 shadow-2xl p-6 sm:p-8 space-y-5 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close admin access dialog"
          className="absolute top-4 right-4 w-9 h-9 rounded-full border border-[#12201A]/15 flex items-center justify-center text-[#12201A]/70 hover:text-[#12201A] hover:border-[#12201A]/35 cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <div>
          <div className="inline-flex items-center gap-2 text-[#0E3B26] t-14 font-bold mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#C9A24B]" aria-hidden="true" />
            <span>Khushdil Clinic Admin</span>
          </div>
          <h2 id="admin-access-title" className="font-serif t-28 font-medium">
            {mode === 'bootstrap'
              ? 'Set Admin Password'
              : mode === 'two-step'
              ? '2-Step Verification'
              : 'Enter Admin Password'}
          </h2>
          <p className="t-14 text-[#12201A]/75 mt-1">
            {mode === 'bootstrap'
              ? 'Create the clinic owner login to open the dashboard.'
              : mode === 'two-step'
              ? 'Enter the 6-digit verification code sent to your clinic email.'
              : 'Unlock the clinic dashboard for inquiries, photos & analytics.'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-[#C46A3C]/15 border border-[#C46A3C] t-14 font-bold text-[#12201A]"
          >
            {error}
          </div>
        )}

        {needsBootstrap === null ? (
          <p className="t-14 text-[#12201A]/65 py-4">Checking clinic setup...</p>
        ) : mode === 'bootstrap' ? (
          <form onSubmit={handleBootstrap} className="space-y-4">
            <div>
              <label htmlFor="modal-owner-name" className="block t-14 font-bold mb-1">
                Owner Name
              </label>
              <input
                id="modal-owner-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 text-base"
              />
            </div>
            <div>
              <label htmlFor="modal-owner-email" className="block t-14 font-bold mb-1">
                Owner Email
              </label>
              <input
                id="modal-owner-email"
                ref={inputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vaid@khushdilclinic.in"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 text-base"
              />
            </div>
            <div>
              <label htmlFor="modal-owner-pass" className="block t-14 font-bold mb-1">
                Choose Password (8+ chars)
              </label>
              <div className="relative">
                <input
                  id="modal-owner-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-3.5 pr-11 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#12201A]/60 hover:text-[#12201A] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Setting up...' : 'Create Owner & Open Admin'}</span>
            </button>
          </form>
        ) : mode === 'two-step' ? (
          <form onSubmit={handleTwoStep} className="space-y-4">
            {hint && <p className="t-14 text-[#3E7A4A] font-bold">{hint}</p>}
            <div>
              <label htmlFor="modal-two-step" className="block t-14 font-bold mb-1">
                6-Digit Verification Code
              </label>
              <input
                id="modal-two-step"
                ref={inputRef}
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 tracking-widest text-lg font-bold"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              <span>{loading ? 'Verifying...' : 'Verify & Open Admin'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="t-14 font-bold text-[#12201A]/75 underline cursor-pointer"
            >
              Back to password
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {showEmailField && (
              <div>
                <label htmlFor="modal-admin-email" className="block t-14 font-bold mb-1">
                  Account Email
                </label>
                <input
                  id="modal-admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vaid@khushdilclinic.in"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 text-base"
                />
              </div>
            )}

            <div>
              <label htmlFor="modal-admin-password" className="block t-14 font-bold mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="modal-admin-password"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter clinic admin password"
                  className="w-full min-h-[44px] pl-3.5 pr-11 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#12201A]/60 hover:text-[#12201A] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Unlocking...' : 'Open Admin Panel'}</span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-bold text-[#12201A]/75">
              <button
                type="button"
                onClick={() => setShowEmailField((v) => !v)}
                className="hover:text-[#0E3B26] underline cursor-pointer"
              >
                {showEmailField ? 'Use password only' : 'Sign in with email'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullAuth();
                }}
                className="hover:text-[#0E3B26] underline cursor-pointer"
              >
                Reset password / full page
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
