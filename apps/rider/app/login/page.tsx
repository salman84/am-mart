'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, Bike, TrendingUp, Navigation,
  AlertCircle, Clock, XCircle, ArrowLeft,
} from 'lucide-react';
import { useLanguage } from '../../lib/useLanguage';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type GateStatus = 'pending' | 'rejected' | null;

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gateStatus, setGateStatus] = useState<GateStatus>(null);
  const [gateMessage, setGateMessage] = useState('');
  const [appName, setAppName] = useState('');
  const [appLogo, setAppLogo] = useState('');
  const [cms, setCms] = useState<Record<string, string>>({});

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('riderToken') : null;
    if (token) router.replace('/dashboard');

    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') setCms(data);
        if (data?.APP_NAME) setAppName(data.APP_NAME);
        if (data?.APP_LOGO) setAppLogo(data.APP_LOGO);
      })
      .catch(() => {});
  }, [router]);

  const c = (key: string, fallback: string) => cms[key] || fallback;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error(t.error);
      return;
    }
    setLoading(true);
    setGateStatus(null);
    try {
      const res = await authApi.login({ identifier: identifier.trim(), password });
      const { accessToken, token, user } = res.data;
      if (!['RIDER'].includes(user?.role)) {
        toast.error(c('RLP_ACCESS_DENIED', t.accessDenied));
        return;
      }
      localStorage.setItem('riderToken', accessToken || token);
      localStorage.setItem('riderUser', JSON.stringify(user));
      toast.success(c('RLP_WELCOME_BACK', t.welcomeBack));
      router.replace('/dashboard');
    } catch (err: any) {
      const msg: string = err.response?.data?.message || err.message || t.error;
      if (msg.includes('under review') || msg.includes('검토 중') || msg.includes('Under review')) {
        setGateStatus('pending');
        setGateMessage(msg);
      } else if (msg.includes('rejected') || msg.includes('거부') || msg.includes('rejected')) {
        setGateStatus('rejected');
        setGateMessage(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Approval gate: Pending ────────────────────────────────────────────────
  if (gateStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            {c('RLP_AWAITING_APPROVAL', t.awaitingApproval)}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            {c('RLP_AWAITING_APPROVAL_DESC', t.awaitingApprovalDesc)}
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-sm text-amber-700 text-left">
            <AlertCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />
            {c('RLP_REVIEW_TIME', t.reviewTime)}
          </div>
          <button
            onClick={() => setGateStatus(null)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {c('RLP_BACK_TO_SIGN_IN', t.backToSignIn)}
          </button>
        </div>
      </div>
    );
  }

  // ── Approval gate: Rejected ───────────────────────────────────────────────
  if (gateStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            {c('RLP_APPLICATION_REJECTED', t.applicationRejected)}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            {c('RLP_APPLICATION_REJECTED_DESC', t.applicationRejectedDesc)}
          </p>
          {gateMessage && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-sm text-red-700 text-left">
              {gateMessage}
            </div>
          )}
          <p className="text-sm text-gray-500 mb-6">
            {c('RLP_CONTACT_SUPPORT_REAPPLY', t.contactSupportOrReapply)}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setGateStatus(null)}
              className="flex-1 border border-gray-200 text-sm font-semibold py-3 rounded-xl text-gray-700 hover:bg-gray-50"
            >
              {c('RLP_GO_BACK', t.goBack)}
            </button>
            <Link
              href="/register"
              className="flex-1 bg-primary text-white text-sm font-semibold py-3 rounded-xl text-center hover:bg-primary-dark transition-colors"
            >
              {c('RLP_RE_APPLY', t.reApply)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Login form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left — Blue gradient panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-sky-800 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="max-w-sm w-full relative z-10">
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-14 w-auto object-contain mb-6" />
          ) : appName ? (
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <span className="text-white font-extrabold text-2xl">{appName.substring(0, 2).toUpperCase()}</span>
            </div>
          ) : null}
          <h1 className="text-3xl font-extrabold mb-2">{appName}</h1>
          <p className="text-white/80 text-lg mb-10">{c('RLP_RIDER_PORTAL', t.riderPortal)}</p>

          <div className="space-y-5">
            {[
              { icon: Bike, text: c('RLP_LOGIN_FEATURE_1', t.manageDeliveries) },
              { icon: Navigation, text: c('RLP_LOGIN_FEATURE_2', t.realtimeNavigation) },
              { icon: TrendingUp, text: c('RLP_LOGIN_FEATURE_3', t.viewEarningsAnalytics) },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90 font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Back to landing */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {c('RLP_BACK_TO_LANDING', t.backToRiderLanding)}
            </Link>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 lg:hidden">
              {appLogo ? (
                <img src={appLogo} alt={appName} className="h-10 w-auto object-contain" />
              ) : appName ? (
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{appName.substring(0, 2).toUpperCase()}</span>
                </div>
              ) : null}
              <div>
                <div className="font-bold text-gray-900">{appName}</div>
                <div className="text-xs text-gray-500">{c('RLP_RIDER_PORTAL', t.riderPortal)}</div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher lang={lang} setLang={setLang} />
              <Link href="/" className="lg:hidden text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{c('RLP_WELCOME_BACK', t.welcomeBack)}</h2>
            <p className="text-gray-500 text-sm mb-8">{c('RLP_SIGN_IN_SUBTITLE', t.signInSubtitle)}</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="form-label" htmlFor="identifier">
                  {c('RLP_EMAIL_OR_PHONE', t.emailOrPhone)}
                </label>
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  placeholder={c('RLP_EMAIL_PHONE_PLACEHOLDER', t.emailOrPhonePlaceholder)}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="password">
                  {c('RLP_PASSWORD', t.password)}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input pr-12"
                    placeholder={c('RLP_PASSWORD_PLACEHOLDER', t.passwordPlaceholder)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-base"
              >
                {loading ? c('RLP_SIGNING_IN', t.signingIn) : c('RLP_SIGN_IN', t.signIn)}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-3">
                {c('RLP_NO_RIDER_ACCOUNT', t.noRiderAccountYet)}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {c('RLP_REGISTER_AS_RIDER', t.registerAsRider)} →
              </Link>
            </div>

            {/* Back to landing */}
            <div className="mt-4 text-center">
              <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                {c('RLP_BACK_TO_HOME', t.backToRiderHome)}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
