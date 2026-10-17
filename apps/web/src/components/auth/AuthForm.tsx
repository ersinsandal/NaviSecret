import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import LanguageSelector from '@/components/common/LanguageSelector';

export default function AuthForm() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.authFailedDefault'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full px-4 py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50 select-none relative">
      {/* Top-Right Language Selector */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      <div className="w-full max-w-sm rounded-3xl p-8 bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.12)] relative overflow-hidden">
        {/* Soft Brand Background Aura */}
        <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

        {/* Authentic Navy Keyhole Pin Logo */}
        <div className="flex justify-center mb-4">
          <div className="p-1.5 rounded-2xl bg-[#0F172A] shadow-lg shadow-slate-900/10 transition-transform hover:scale-105 duration-200">
            <img
              src="/logo-icon.svg"
              alt="NaviSecret Logo"
              className="w-16 h-16 rounded-xl"
            />
          </div>
        </div>

        {/* Typography */}
        <h1 className="text-2xl font-black text-center mb-0.5 tracking-tight text-[#0F172A]">
          Navi<span className="text-[#00B894]">Secret</span>
        </h1>
        <p className="text-[10px] text-center mb-1 font-bold tracking-widest uppercase text-slate-500">
          {t('common.tagline')}
        </p>
        <p className="text-xs text-center mb-6 text-slate-400">
          {isSignUp ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
        </p>

        {/* Auth Mode Switcher */}
        <div className="grid grid-cols-2 p-1 mb-5 rounded-2xl bg-slate-100 border border-slate-200/70 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-white text-[#0F172A] shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('auth.signInTitle')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              isSignUp
                ? 'bg-white text-[#0F172A] shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('auth.signUpTitle')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {isSignUp && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                {t('auth.displayNameLabel')}
              </label>
              <input
                type="text"
                placeholder={t('auth.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20 transition-all font-sans"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
              {t('auth.emailLabel')}
            </label>
            <input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20 transition-all font-sans"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
              {t('auth.passwordLabel')}
            </label>
            <input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl px-4 py-3 text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20 transition-all font-sans"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-xs font-bold tracking-wide uppercase bg-[#0F172A] hover:bg-[#1E293B] text-white disabled:opacity-50 transition-all shadow-md shadow-slate-900/10 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isSignUp ? t('auth.signingUp') : t('auth.signingIn')}
              </span>
            ) : isSignUp ? (
              t('auth.signUpButton')
            ) : (
              t('auth.signInButton')
            )}
          </button>
        </form>

        <p className="text-xs text-center mt-6 mb-0 text-slate-500">
          {isSignUp ? t('auth.hasAccountPrompt') : t('auth.noAccountPrompt')}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="bg-transparent border-none cursor-pointer underline p-0 text-xs text-[#00B894] hover:text-[#009874] font-bold"
          >
            {isSignUp ? t('auth.signInLink') : t('auth.createOne')}
          </button>
        </p>
      </div>
    </div>
  );
}
