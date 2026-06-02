'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authApi, riderApi, uploadApi } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, CheckCircle, Loader2, ArrowLeft,
  User, Phone, Mail, Lock, Bike, FileText,
  ShieldCheck, UploadCloud, Sparkles, ArrowRight, Navigation,
} from 'lucide-react';
import { useLanguage } from '../../lib/useLanguage';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function RiderFlowHeader({
  appName,
  appLogo,
  lang,
  setLang,
  signInLabel,
}: {
  appName: string;
  appLogo: string;
  lang: any;
  setLang: (lang: any) => void;
  signInLabel: string;
}) {
  return (
    <div className="relative border-b border-blue-100 bg-white/95 backdrop-blur">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-9 w-auto object-contain" />
          ) : appName ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500">
              <span className="text-sm font-extrabold text-white">{appName.substring(0, 2).toUpperCase()}</span>
            </div>
          ) : null}
          <div>
            <span className="text-base font-extrabold text-gray-900">{appName}</span>
            <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">
              {/* Badge from CMS — set via c() in parent */}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher lang={lang} setLang={setLang} />
          <Link href="/login" className="hidden px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-blue-600 sm:inline-flex">
            {signInLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { lang, setLang, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [appName, setAppName] = useState('');
  const [appLogo, setAppLogo] = useState('');
  const [cms, setCms] = useState<Record<string, string>>({});

  const [licenseDocUploading, setLicenseDocUploading] = useState(false);
  const [idDocUploading, setIdDocUploading] = useState(false);
  const [licenseDocUrl, setLicenseDocUrl] = useState('');
  const [licenseDocName, setLicenseDocName] = useState('');
  const [idDocUrl, setIdDocUrl] = useState('');
  const [idDocName, setIdDocName] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    vehicleType: 'MOTORCYCLE',
    vehicleNumber: '',
    licenseNumber: '',
    agreements: {} as Record<string, boolean>,
  });

  const set = (field: string, value: string | boolean | Record<string, boolean>) =>
    setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') setCms(data);
        if (data?.APP_NAME) setAppName(data.APP_NAME);
        if (data?.APP_LOGO) setAppLogo(data.APP_LOGO);
      })
      .catch(() => {});
  }, []);

  const c = (key: string, fallback: string) => cms[key] || fallback;

  // Vehicle types — all text from CMS/i18n
  const vehicleTypes = [
    { value: 'MOTORCYCLE', label: c('RLP_VEHICLE_MOTORCYCLE', t.vehicleMotorcycle), sub: c('RLP_VEHICLE_MOTORCYCLE_KO', t.vehicleMotorcycleKo) },
    { value: 'BICYCLE', label: c('RLP_VEHICLE_BICYCLE', t.vehicleBicycle), sub: c('RLP_VEHICLE_BICYCLE_KO', t.vehicleBicycleKo) },
    { value: 'SCOOTER', label: c('RLP_VEHICLE_SCOOTER', t.vehicleScooter), sub: c('RLP_VEHICLE_SCOOTER_KO', t.vehicleScooterKo) },
    { value: 'CAR', label: c('RLP_VEHICLE_CAR', t.vehicleCar), sub: c('RLP_VEHICLE_CAR_KO', t.vehicleCarKo) },
    { value: 'ELECTRIC_BIKE', label: c('RLP_VEHICLE_ELECTRIC_BIKE', t.vehicleElectricBike), sub: c('RLP_VEHICLE_ELECTRIC_BIKE_KO', t.vehicleElectricBikeKo) },
    { value: 'WALKING', label: c('RLP_VEHICLE_WALKING', t.vehicleWalking), sub: c('RLP_VEHICLE_WALKING_KO', t.vehicleWalkingKo) },
  ];

  // Agreement labels — all text from CMS/i18n
  const agreements = [
    { key: 'riderTerms', label: c('RLP_AGREEMENT_RIDER_TERMS', t.agreementRiderTerms) },
    { key: 'privacyPolicy', label: c('RLP_AGREEMENT_PRIVACY', t.agreementPrivacyPolicy) },
    { key: 'personalInfo', label: c('RLP_AGREEMENT_PERSONAL_INFO', t.agreementPersonalInfo) },
    { key: 'vehicleDocuments', label: c('RLP_AGREEMENT_VEHICLE_DOCS', t.agreementVehicleDocuments) },
    { key: 'safetyPolicy', label: c('RLP_AGREEMENT_SAFETY', t.agreementSafetyPolicy) },
    { key: 'trueInfo', label: c('RLP_AGREEMENT_TRUE_INFO', t.agreementTrueInfo) },
    { key: 'falseInfo', label: c('RLP_AGREEMENT_FALSE_INFO', t.agreementFalseInfo) },
    { key: 'deliveryPolicy', label: c('RLP_AGREEMENT_DELIVERY', t.agreementDeliveryPolicy) },
  ];

  const allAgreementsChecked = agreements.every(({ key }) => form.agreements[key]);

  const handleDocUpload = async (type: 'license' | 'id', file?: File) => {
    if (!file) return;
    const setUploading = type === 'license' ? setLicenseDocUploading : setIdDocUploading;
    setUploading(true);
    try {
      const res = await uploadApi.uploadDocument(file, 'rider-documents');
      if (type === 'license') {
        setLicenseDocUrl(res.data.url);
        setLicenseDocName(res.data.originalFileName);
      } else {
        setIdDocUrl(res.data.url);
        setIdDocName(res.data.originalFileName);
      }
      toast.success(c('RLP_DOC_UPLOADED', t.documentUploaded));
    } catch (err: any) {
      toast.error(err.response?.data?.message || c('RLP_UPLOAD_FAILED', t.uploadFailed));
    } finally {
      setUploading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error(c('RLP_PASSWORD_MIN', t.passwordMinLength));
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(c('RLP_PASSWORD_MISMATCH', t.passwordMismatch));
      return;
    }
    if (!allAgreementsChecked) {
      toast.error(c('RLP_AGREE_ALL', t.agreeAllPolicies));
      return;
    }
    setLoading(true);
    try {
      // Step 1: Register as user
      const registerRes = await authApi.register({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'RIDER',
      });

      const { accessToken, token } = registerRes.data;
      const authToken = accessToken || token;

      if (authToken) {
        localStorage.setItem('riderToken', authToken);
      }

      // Step 2: Register rider details
      await riderApi.register({
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber.trim(),
        licenseNumber: form.licenseNumber.trim(),
        licenseDocUrl: licenseDocUrl || undefined,
        idDocUrl: idDocUrl || undefined,
      });

      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        toast.error(msg[0]);
      } else {
        toast.error(msg || err.message || t.error);
      }
    } finally {
      setLoading(false);
      localStorage.removeItem('riderToken');
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 max-w-lg w-full text-center">
          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center animate-pulse-blue">
              <CheckCircle className="w-12 h-12 text-blue-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white text-sm">⏳</span>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
            {c('RLP_REGISTER_SUCCESS', t.registerSuccess)}
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-8">
            {c('RLP_SUCCESS_DESC', t.successDesc)}
          </p>

          {/* Status steps */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4">
            {[
              { icon: '✅', label: c('RLP_STEP_SUBMITTED', t.applicationSubmittedStep), done: true },
              { icon: '🔍', label: c('RLP_STEP_REVIEW', t.teamReviewStep), done: false },
              { icon: '📧', label: c('RLP_STEP_EMAIL', t.emailNotificationStep), done: false },
              { icon: '🏍️', label: c('RLP_STEP_DELIVER', t.startDeliveringStep), done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{step.icon}</span>
                <span className={`text-sm ${step.done ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                  {step.label}
                </span>
                {step.done && <CheckCircle className="w-4 h-4 text-blue-500 ml-auto" />}
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-primary-dark transition-colors"
          >
            {c('RLP_GO_TO_SIGN_IN', t.goToSignIn)}
          </Link>
          <div className="mt-4">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              {c('RLP_BACK_TO_HOME', t.backToHome)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration Form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <RiderFlowHeader appName={appName} appLogo={appLogo} lang={lang} setLang={setLang} signInLabel={c('RLP_SIGN_IN', t.signIn)} />

      {/* Page header */}
      <div className="bg-gradient-to-br from-blue-600 to-sky-700 py-12 px-4 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Bike className="w-4 h-4" />
            {c('RLP_RIDER_PORTAL', t.riderPortal)}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            {c('RLP_RIDER_APPLICATION', t.riderApplication)}
          </h1>
          <p className="text-blue-100 text-base max-w-md mx-auto">
            {c('RLP_RIDER_APPLICATION_DESC', t.riderApplicationDesc)}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
        >
          <ArrowLeft className="w-4 h-4" />
          {c('RLP_BACK_TO_RIDER_HOME', t.backToRiderHome)}
        </Link>

        <form onSubmit={handleRegister} className="space-y-6">

          {/* ── Section 1: Personal Info ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('RLP_PERSONAL_INFO', t.personalInformation)}
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="form-label" htmlFor="fullName">{c('RLP_FULL_NAME', t.fullName)}</label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder={c('RLP_FULL_NAME_PLACEHOLDER', t.fullNamePlaceholder)}
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="form-label" htmlFor="phone">{c('RLP_PHONE', t.phone)}</label>
                <input
                  id="phone"
                  type="tel"
                  className="form-input"
                  placeholder={c('RLP_PHONE_PLACEHOLDER', t.phonePlaceholder)}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="form-label" htmlFor="email">{c('RLP_EMAIL', t.email)}</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder={c('RLP_EMAIL_PLACEHOLDER', t.emailPlaceholder)}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="form-label" htmlFor="reg-password">{c('RLP_PASSWORD', t.password)}</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input pr-12"
                    placeholder={c('RLP_PASSWORD_PLACEHOLDER', t.passwordPlaceholder)}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="form-label" htmlFor="confirmPassword">{c('RLP_CONFIRM_PASSWORD', t.confirmPassword)}</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input pr-12"
                    placeholder={c('RLP_CONFIRM_PASSWORD_PLACEHOLDER', t.confirmPasswordPlaceholder)}
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{c('RLP_PASSWORD_MISMATCH', t.passwordMismatch)}</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 8 && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {c('RLP_PASSWORDS_MATCH', t.passwordsMatch)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 2: Vehicle Info ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
                <Bike className="w-4 h-4 text-sky-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('RLP_VEHICLE_INFO', t.vehicleInformation)}
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Vehicle Type */}
              <div className="sm:col-span-2">
                <label className="form-label" htmlFor="vehicleType">{c('RLP_VEHICLE_TYPE', t.vehicleType)}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {vehicleTypes.map((vt) => (
                    <button
                      key={vt.value}
                      type="button"
                      onClick={() => set('vehicleType', vt.value)}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${
                        form.vehicleType === vt.value
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm font-bold text-gray-900">{vt.label}</div>
                      {vt.sub && <div className="text-xs text-gray-500 mt-0.5">{vt.sub}</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="form-label" htmlFor="vehicleNumber">{c('RLP_VEHICLE_NUMBER', t.vehicleNumber)}</label>
                <input
                  id="vehicleNumber"
                  type="text"
                  className="form-input"
                  placeholder={c('RLP_VEHICLE_NUMBER_PLACEHOLDER', t.vehicleNumberPlaceholder)}
                  value={form.vehicleNumber}
                  onChange={(e) => set('vehicleNumber', e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {c('RLP_VEHICLE_PLATE_HELP', t.vehiclePlateHelp)}
                </p>
              </div>

              {/* License Number */}
              <div>
                <label className="form-label" htmlFor="licenseNumber">{c('RLP_LICENSE_NUMBER', t.licenseNumber)}</label>
                <input
                  id="licenseNumber"
                  type="text"
                  className="form-input"
                  placeholder={c('RLP_LICENSE_NUMBER_PLACEHOLDER', t.licenseNumberPlaceholder)}
                  value={form.licenseNumber}
                  onChange={(e) => set('licenseNumber', e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {c('RLP_VALID_LICENSE_HELP', t.validLicenseHelp)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 3: Document Uploads ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                <UploadCloud className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {c('RLP_DOC_UPLOADS', t.documentUploads)}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {c('RLP_DOC_UPLOADS_DESC', t.documentUploadsDesc)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* License Document */}
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {c('RLP_DRIVER_LICENSE_COPY', t.driverLicenseCopy)}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                        {c('RLP_RECOMMENDED', t.recommended)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {c('RLP_LICENSE_FRONT_BACK', t.licenseFrontBack)}
                    </p>
                    {licenseDocName && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {licenseDocName}
                      </p>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100">
                    {licenseDocUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {licenseDocName ? c('RLP_REPLACE_FILE', t.replaceFile) : c('RLP_UPLOAD_FILE', t.uploadFile)}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) => handleDocUpload('license', e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              {/* ID Document */}
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {c('RLP_GOV_ID_COPY', t.governmentIdCopy)}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                        {c('RLP_RECOMMENDED', t.recommended)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {c('RLP_GOV_ID_DESC', t.govIdDesc)}
                    </p>
                    {idDocName && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {idDocName}
                      </p>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100">
                    {idDocUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {idDocName ? c('RLP_REPLACE_FILE', t.replaceFile) : c('RLP_UPLOAD_FILE', t.uploadFile)}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) => handleDocUpload('id', e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Required Agreements ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('RLP_REQUIRED_AGREEMENTS', t.requiredAgreements)}
              </h3>
            </div>

            <div className="space-y-3">
              {agreements.map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(form.agreements[key])}
                    onChange={(e) => set('agreements', { ...form.agreements, [key]: e.target.checked })}
                    required
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Notice box ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
            <div className="text-2xl">⏳</div>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">
                {c('RLP_APPROVAL_PROCESS', t.approvalProcess)}
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                {c('RLP_APPROVAL_PROCESS_DESC', t.approvalProcessDesc)}
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {c('RLP_REGISTERING', t.registering)}
              </span>
            ) : (
              c('RLP_REGISTER_BUTTON', t.registerButton)
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            {c('RLP_ALREADY_HAVE_ACCOUNT', t.alreadyHaveAccount)}{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {c('RLP_SIGN_IN', t.signIn)}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
