'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, Package, TrendingUp, ShoppingBag,
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
  const [appName, setAppName] = useState('AM Mart');
  const [appLogo, setAppLogo] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sellerToken') : null;
    if (token) router.replace('/dashboard');

    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.APP_NAME) setAppName(data.APP_NAME);
        if (data?.APP_LOGO) setAppLogo(data.APP_LOGO);
      })
      .catch(() => {});
  }, [router]);

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
      if (!['SELLER'].includes(user?.role)) {
        toast.error('Access denied. Seller accounts only.');
        return;
      }
      localStorage.setItem('sellerToken', accessToken || token);
      localStorage.setItem('sellerUser', JSON.stringify(user));
      toast.success(t.welcomeBack);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg: string = err.response?.data?.message || err.message || t.error;
      // Detect approval gate errors
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

  // ── Approval gate screens ──────────────────────────────────────────────────
  if (gateStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            {lang === 'ko' ? '승인 대기 중' : 'Awaiting Approval'}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            {lang === 'ko'
              ? '판매자 신청이 검토 중입니다. 저희 팀이 곧 연락드릴 예정입니다. 승인이 완료되면 이메일로 안내드립니다.'
              : 'Your seller application is currently under review. Our team will get back to you shortly. You will be notified via email once approved.'}
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-sm text-amber-700 text-left">
            <AlertCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />
            {lang === 'ko'
              ? '일반적으로 영업일 기준 1-2일 내에 검토가 완료됩니다.'
              : 'Reviews typically complete within 1–2 business days.'}
          </div>
          <button
            onClick={() => setGateStatus(null)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ko' ? '로그인으로 돌아가기' : 'Back to sign in'}
          </button>
        </div>
      </div>
    );
  }

  if (gateStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            {lang === 'ko' ? '신청이 거부되었습니다' : 'Application Rejected'}
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            {lang === 'ko'
              ? '죄송합니다. 판매자 신청이 거부되었습니다.'
              : 'Sorry, your seller application was not approved.'}
          </p>
          {gateMessage && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-sm text-red-700 text-left">
              {gateMessage}
            </div>
          )}
          <p className="text-sm text-gray-500 mb-6">
            {lang === 'ko'
              ? '자세한 내용은 지원팀에 문의하시거나 새 계정으로 다시 신청하세요.'
              : 'Please contact support for more details or re-apply with a new account.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setGateStatus(null)}
              className="flex-1 border border-gray-200 text-sm font-semibold py-3 rounded-xl text-gray-700 hover:bg-gray-50"
            >
              {lang === 'ko' ? '돌아가기' : 'Go Back'}
            </button>
            <Link
              href="/register"
              className="flex-1 bg-primary text-white text-sm font-semibold py-3 rounded-xl text-center hover:bg-primary-dark transition-colors"
            >
              {lang === 'ko' ? '재신청' : 'Re-apply'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Login form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left — Green gradient panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="max-w-sm w-full relative z-10">
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-14 w-auto object-contain mb-6" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <span className="text-white font-extrabold text-2xl">AM</span>
            </div>
          )}
          <h1 className="text-3xl font-extrabold mb-2">{appName}</h1>
          <p className="text-white/80 text-lg mb-10">{t.sellerPortal}</p>

          <div className="space-y-5">
            {[
              { icon: Package, text: lang === 'ko' ? '상품을 관리하세요' : 'Manage your products' },
              { icon: ShoppingBag, text: lang === 'ko' ? '실시간으로 주문을 추적하세요' : 'Track orders in real-time' },
              { icon: TrendingUp, text: lang === 'ko' ? '수익 및 분석 보기' : 'View earnings & analytics' },
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
              {lang === 'ko' ? '판매자 랜딩 페이지로 돌아가기' : 'Back to Seller Landing Page'}
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
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <div>
                <div className="font-bold text-gray-900">{appName}</div>
                <div className="text-xs text-gray-500">{t.sellerPortal}</div>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{t.welcomeBack}</h2>
            <p className="text-gray-500 text-sm mb-8">{t.signInSubtitle}</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="form-label" htmlFor="identifier">
                  {t.emailOrPhone}
                </label>
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  placeholder={t.emailOrPhonePlaceholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="password">
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input pr-12"
                    placeholder={t.passwordPlaceholder}
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
                {loading ? t.signingIn : t.signIn}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-3">
                {lang === 'ko' ? '아직 판매자 계정이 없으신가요?' : "Don't have a seller account yet?"}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                {t.registerAsSeller} →
              </Link>
            </div>

            {/* Back to landing */}
            <div className="mt-4 text-center">
              <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                {lang === 'ko' ? '판매자 홈으로' : 'Back to Seller Home'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
