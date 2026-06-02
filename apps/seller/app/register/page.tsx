'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { authApi, uploadApi } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, CheckCircle, Loader2, MapPin, ArrowLeft,
  User, Phone, Mail, Lock, Store, FileText, Building2,
  Globe2, Landmark, ShieldCheck, UploadCloud, Sparkles, ArrowRight, Building,
  ChevronDown, Search,
} from 'lucide-react';
import { useLanguage } from '../../lib/useLanguage';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type SellerScope = 'LOCAL' | 'GLOBAL';

type DocumentUpload = {
  requirementId?: string;
  documentType: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
};

const DOCUMENT_REQUIREMENTS = [
  {
    key: 'BUSINESS_REGISTRATION_CERTIFICATE',
    title: 'Business registration certificate',
    korean: '사업자등록증',
    scopes: ['LOCAL'],
    required: true,
  },
  {
    key: 'MAIL_ORDER_SALES_CERTIFICATE',
    title: 'Mail order sales certificate or report number',
    korean: '통신판매업 신고증 또는 신고번호',
    scopes: ['LOCAL'],
    required: true,
  },
  {
    key: 'BANKBOOK_COPY',
    title: 'Settlement bank account copy',
    korean: '통장사본',
    scopes: ['LOCAL'],
    required: true,
  },
  {
    key: 'PURCHASE_SAFETY_SERVICE_CONFIRMATION',
    title: 'Purchase Safety Service Use Confirmation',
    korean: '구매안전서비스 이용확인증',
    scopes: ['LOCAL'],
    required: true,
  },
  {
    key: 'BUSINESS_LICENSE',
    title: 'Business license of your country',
    korean: '',
    scopes: ['GLOBAL'],
    required: true,
  },
  {
    key: 'PASSPORT',
    title: 'Passport or government issued ID',
    korean: '',
    scopes: ['GLOBAL'],
    required: true,
  },
  {
    key: 'BANK_STATEMENT',
    title: 'Bank statement or bank letter',
    korean: '',
    scopes: ['GLOBAL'],
    required: true,
  },
  {
    key: 'PROOF_OF_BUSINESS_OWNERSHIP',
    title: 'Proof of business ownership',
    korean: '',
    scopes: ['GLOBAL'],
    required: true,
  },
] as const;

const COUNTRY_OPTIONS = [
  'South Korea',
  'United States',
  'Pakistan',
  'Vietnam',
  'China',
  'Japan',
  'India',
  'Bangladesh',
  'Philippines',
  'Indonesia',
  'Thailand',
  'Malaysia',
  'Singapore',
  'United Arab Emirates',
  'Saudi Arabia',
  'Turkey',
  'United Kingdom',
  'Germany',
  'France',
  'Canada',
  'Australia',
];

const NATIONALITY_OPTIONS = [
  'Korean',
  'American',
  'Pakistani',
  'Vietnamese',
  'Chinese',
  'Japanese',
  'Indian',
  'Bangladeshi',
  'Filipino',
  'Indonesian',
  'Thai',
  'Malaysian',
  'Singaporean',
  'Emirati',
  'Saudi',
  'Turkish',
  'British',
  'German',
  'French',
  'Canadian',
  'Australian',
];

const BUSINESS_TYPE_OPTIONS = [
  'Individual business',
  'Sole proprietor',
  'Corporation',
  'Limited liability company',
  'Partnership',
  'Importer',
  'Exporter',
  'Manufacturer',
  'Wholesaler',
  'Retailer',
  'Online seller',
  'Brand owner',
  'Distributor',
  'Agency',
  'Non-profit organization',
];

const BUSINESS_CATEGORY_OPTIONS = [
  'Grocery',
  'Food and beverages',
  'Fresh food',
  'Beauty and cosmetics',
  'Fashion and apparel',
  'Electronics',
  'Home and kitchen',
  'Household goods',
  'Health and wellness',
  'Baby and children products',
  'Sports and outdoor',
  'Pet supplies',
  'Books and stationery',
  'Automotive',
  'Imported goods',
  'Digital goods',
  'Other',
];

const REQUIRED_AGREEMENTS = [
  ['sellerTerms', 'I agree to the Seller Terms and Conditions.'],
  ['privacyPolicy', 'I agree to the Privacy Policy.'],
  ['personalInfo', 'I agree to the collection and use of personal information.'],
  ['businessDocuments', 'I agree to the collection and review of business documents.'],
  ['sellerNotices', 'I agree to receive important seller notices by email or SMS.'],
  ['trueInfo', 'I confirm that all submitted business information is true and accurate.'],
  ['falseInfo', 'I understand that my seller account can be rejected, suspended, or terminated if false information is submitted.'],
  ['prohibitedProducts', 'I understand that prohibited or illegal products cannot be sold on this platform.'],
  ['commissionPolicy', 'I agree to the settlement and commission policy.'],
  ['returnPolicy', 'I agree to the return, refund, and customer protection policy.'],
] as const;

function formatBusinessNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function AdvancedCombobox({
  id,
  label,
  value,
  options,
  placeholder,
  required,
  readOnly,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  required?: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const normalizedValue = value.toLowerCase();
  const filtered = options.filter((option) => option.toLowerCase().includes(normalizedValue)).slice(0, 8);

  return (
    <div className="relative">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id={id}
          type="text"
          className="form-input pl-9 pr-10"
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          required={required}
          onFocus={() => !readOnly && setOpen(true)}
          onClick={() => !readOnly && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && setOpen((current) => !current)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && !readOnly && (
        <div className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl">
          {(filtered.length ? filtered : options.slice(0, 8)).map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-700 ${
                option === value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
              }`}
            >
              {option}
            </button>
          ))}
          {value && !options.some((option) => option.toLowerCase() === value.toLowerCase()) && (
            <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
              Press continue with custom value: <span className="font-semibold text-gray-700">{value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SellerFlowHeader({
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
    <div className="relative border-b border-emerald-100 bg-white/95 backdrop-blur">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-9 w-auto object-contain" />
          ) : appName ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
              <span className="text-sm font-extrabold text-white">{appName.substring(0, 2).toUpperCase()}</span>
            </div>
          ) : null}
          <div>
            <span className="text-base font-extrabold text-gray-900">{appName}</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher lang={lang} setLang={setLang} />
          <Link href="/login" className="hidden px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-emerald-600 sm:inline-flex">
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
  const [selectedScope, setSelectedScope] = useState<SellerScope | null>(null);
  const [documentUploads, setDocumentUploads] = useState<Record<string, DocumentUpload>>({});
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);

  const [storeNameStatus, setStoreNameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const storeNameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    sellerScope: 'LOCAL',
    sellerAccountType: 'BUSINESS',
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    preferredLanguage: 'en',
    countryOfResidence: 'South Korea',
    nationality: '',
    representativeName: '',
    dateOfBirth: '',
    passportNumber: '',
    contactAddress: '',
    emergencyContact: '',
    storeName: '',
    storeCategory: '',
    businessRegNumber: '',
    businessName: '',
    businessType: '',
    businessCategory: '',
    mailOrderSalesReportNumber: '',
    businessPhone: '',
    businessEmail: '',
    taxInvoiceEmail: '',
    vatStatus: '',
    businessOpeningDate: '',
    globalBusinessLicenseNumber: '',
    countryOfIncorporation: '',
    address: '',
    detailAddress: '',
    storeDescription: '',
    bankCountry: 'South Korea',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    swiftCode: '',
    bankAddress: '',
    settlementCurrency: 'KRW',
    settlementCycle: 'MONTHLY',
    privacyDocumentConsent: false,
    agreements: {} as Record<string, boolean>,
  });

  const set = (field: string, value: string | boolean | Record<string, boolean>) => setForm((f) => ({ ...f, [field]: value }));
  const isGlobalSeller = form.sellerScope === 'GLOBAL';
  const allAgreementsChecked = REQUIRED_AGREEMENTS.every(([key]) => form.agreements[key]);
  const requiredDocuments = DOCUMENT_REQUIREMENTS.filter((document) => (document.scopes as readonly string[]).includes(form.sellerScope));
  const allRequiredDocumentsUploaded = requiredDocuments
    .filter((document) => document.required)
    .every((document) => Boolean(documentUploads[document.key]));

  const chooseScope = (scope: SellerScope) => {
    setSelectedScope(scope);
    setForm((f) => ({
      ...f,
      sellerScope: scope,
      sellerAccountType: scope === 'GLOBAL' ? 'GLOBAL' : 'BUSINESS',
      countryOfResidence: scope === 'GLOBAL' ? '' : 'South Korea',
      bankCountry: scope === 'GLOBAL' ? '' : 'South Korea',
      settlementCurrency: scope === 'GLOBAL' ? 'USD' : 'KRW',
      address: '',
      detailAddress: '',
    }));
    setDocumentUploads({});
  };

  const handleDocumentUpload = async (documentType: string, file?: File) => {
    if (!file) return;
    setUploadingDocument(documentType);
    try {
      const res = await uploadApi.uploadDocument(file, `seller-documents/${form.sellerScope.toLowerCase()}`);
      setDocumentUploads((current) => ({
        ...current,
        [documentType]: {
          documentType,
          fileUrl: res.data.url,
          originalFileName: res.data.originalFileName,
          mimeType: res.data.mimeType,
          fileSize: res.data.fileSize,
        },
      }));
      toast.success('Document uploaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Document upload failed');
    } finally {
      setUploadingDocument(null);
    }
  };

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

  // Debounced store name check
  useEffect(() => {
    if (storeNameTimer.current) clearTimeout(storeNameTimer.current);
    if (!form.storeName.trim() || form.storeName.trim().length < 2) {
      setStoreNameStatus('idle');
      setSuggestions([]);
      return;
    }
    setStoreNameStatus('checking');
    storeNameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/sellers/check-store-name?name=${encodeURIComponent(form.storeName.trim())}`);
        const data = await res.json();
        if (data?.available) {
          setStoreNameStatus('available');
          setSuggestions([]);
        } else {
          setStoreNameStatus('taken');
          setSuggestions(data?.suggestions || []);
        }
      } catch {
        setStoreNameStatus('idle');
      }
    }, 600);
    return () => { if (storeNameTimer.current) clearTimeout(storeNameTimer.current); };
  }, [form.storeName]);

  const openKakaoPostcode = () => {
    const open = () => {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setForm((prev) => ({ ...prev, address: data.address || data.jibunAddress }));
        },
      }).open();
    };
    if ((window as any).daum) {
      open();
    } else {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = open;
      document.head.appendChild(script);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error(c('LP_PASSWORD_MIN_LENGTH', t.passwordMinLength));
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(c('LP_PASSWORD_MISMATCH', t.passwordMismatch));
      return;
    }
    if (!form.privacyDocumentConsent) {
      toast.error(c('LP_PRIVACY_CONSENT_REQUIRED', t.privacyConsentRequired));
      return;
    }
    if (!allAgreementsChecked) {
      toast.error(c('LP_AGREE_ALL_POLICIES', t.agreeAllPolicies));
      return;
    }
    if (!allRequiredDocumentsUploaded) {
      toast.error(isGlobalSeller ? c('LP_UPLOAD_ALL_GLOBAL_DOCS', t.uploadAllGlobalDocs) : c('LP_UPLOAD_ALL_LOCAL_DOCS', t.uploadAllLocalDocs));
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        sellerScope: form.sellerScope,
        sellerAccountType: form.sellerAccountType,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        preferredLanguage: form.preferredLanguage,
        countryOfResidence: form.countryOfResidence,
        nationality: form.nationality.trim(),
        representativeName: form.representativeName.trim(),
        dateOfBirth: form.dateOfBirth,
        passportNumber: form.passportNumber.trim(),
        contactAddress: form.contactAddress.trim(),
        emergencyContact: form.emergencyContact.trim(),
        role: 'SELLER',
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim(),
        businessRegNumber: form.businessRegNumber.trim(),
        businessName: form.businessName.trim(),
        businessType: form.businessType.trim(),
        businessCategory: form.businessCategory.trim(),
        mailOrderSalesReportNumber: form.mailOrderSalesReportNumber.trim(),
        businessPhone: form.businessPhone.trim(),
        businessEmail: form.businessEmail.trim(),
        taxInvoiceEmail: form.taxInvoiceEmail.trim(),
        vatStatus: form.vatStatus,
        businessOpeningDate: form.businessOpeningDate,
        globalBusinessLicenseNumber: form.globalBusinessLicenseNumber.trim(),
        countryOfIncorporation: form.countryOfIncorporation.trim(),
        address: form.address.trim(),
        detailAddress: form.detailAddress.trim(),
        bankCountry: form.bankCountry.trim(),
        bankName: form.bankName.trim(),
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        swiftCode: form.swiftCode.trim(),
        bankAddress: form.bankAddress.trim(),
        settlementCurrency: form.settlementCurrency,
        settlementCycle: form.settlementCycle,
        privacyDocumentConsent: form.privacyDocumentConsent,
        agreements: form.agreements,
        documentUploads: Object.values(documentUploads),
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
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 max-w-lg w-full text-center">
          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse-green">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white text-sm">⏳</span>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
            {c('LP_REGISTER_SUCCESS', t.registerSuccess)}
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-8">
            {c('LP_SUCCESS_DESCRIPTION', t.successDescription)}
          </p>

          {/* Status steps */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4">
            {[
              { icon: '✅', label: c('LP_STEP_APPLICATION_SUBMITTED', t.stepApplicationSubmitted), done: true },
              { icon: '🔍', label: c('LP_STEP_TEAM_REVIEW', t.stepTeamReview), done: false },
              { icon: '📧', label: c('LP_STEP_EMAIL_NOTIFICATION', t.stepEmailNotification), done: false },
              { icon: '🚀', label: c('LP_STEP_START_SELLING', t.stepStartSelling), done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{step.icon}</span>
                <span className={`text-sm ${step.done ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  {step.label}
                </span>
                {step.done && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-primary-dark transition-colors"
          >
            {c('LP_GO_TO_SIGN_IN', t.goToSignIn)}
          </Link>
          <div className="mt-4">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              {c('LP_BACK_TO_HOME', t.backToHome)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedScope) {
    return (
      <div className="min-h-screen overflow-hidden bg-[#f6fbf7] text-gray-900">
        <SellerFlowHeader appName={appName} appLogo={appLogo} lang={lang} setLang={setLang} signInLabel={t.signIn} />

        <section className="relative px-4 py-12 sm:py-16">
          <div className="absolute left-8 top-16 hidden h-20 w-20 rounded-full border border-emerald-200 sm:block animate-spin-slow" />
          <div className="absolute right-10 top-28 hidden h-28 w-28 rounded-[2rem] border border-amber-200 sm:block animate-float-slow" />
          <div className="absolute left-1/2 bottom-6 h-24 w-24 -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="max-w-7xl mx-auto">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
            >
              <ArrowLeft className="w-4 h-4" />
              {c('LP_BACK_TO_SELLER_HOME', t.backToSellerHome)}
            </Link>

            <div className="text-center max-w-3xl mx-auto mb-10 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm">
                <Sparkles className="w-4 h-4" />
                {c('LP_SELLER_REGISTRATION_PATH', t.sellerRegistrationPath)}
              </div>
              <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-normal text-gray-950">
                {c('LP_CHOOSE_HOW_TO_SELL', t.chooseHowToSell)}
              </h1>
              <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
                {c('LP_SCOPE_SELECTION_DESC', t.scopeSelectionDesc)}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <button
                type="button"
                onClick={() => chooseScope('LOCAL')}
                className="group relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-white p-7 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-100 animate-fade-in-left"
              >
                <div className="absolute right-6 top-6 h-20 w-20 rounded-3xl bg-emerald-50 transition-transform group-hover:rotate-6 group-hover:scale-110" />
                <div className="relative flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider text-emerald-600">{c('LP_LOCAL_SELLER_LABEL', t.localSellerLabel)}</div>
                    <h2 className="mt-2 text-2xl font-black text-gray-950">{c('LP_SELL_AS_KOREAN_SELLER', t.sellAsKoreanSeller)}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {c('LP_LOCAL_SELLER_DESC', t.localSellerDesc)}
                    </p>
                  </div>
                </div>
                <div className="relative mt-7 grid grid-cols-2 gap-3 text-sm">
                  {['Daum/Kakao address', '사업자등록증', '통신판매업 신고증', '통장사본'].map((item) => (
                    <div key={item} className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-900">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white">
                  {c('LP_OPEN_LOCAL_FORM', t.openLocalForm)}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => chooseScope('GLOBAL')}
                className="group relative overflow-hidden rounded-[2rem] border border-teal-200 bg-white p-7 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-100 animate-fade-in-right"
              >
                <div className="absolute right-6 top-6 h-20 w-20 rounded-full bg-teal-50 transition-transform group-hover:scale-125" />
                <div className="relative flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-100">
                    <Globe2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider text-teal-700">{c('LP_GLOBAL_SELLER_LABEL', t.globalSellerLabel)}</div>
                    <h2 className="mt-2 text-2xl font-black text-gray-950">{c('LP_SELL_TO_KOREA_FROM_OVERSEAS', t.sellToKoreaFromOverseas)}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {c('LP_GLOBAL_SELLER_DESC', t.globalSellerDesc)}
                    </p>
                  </div>
                </div>
                <div className="relative mt-7 grid grid-cols-2 gap-3 text-sm">
                  {['Global address', 'Business license', 'Passport / ID', 'SWIFT bank info'].map((item) => (
                    <div key={item} className="rounded-2xl bg-teal-50 px-4 py-3 font-semibold text-teal-950">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white">
                  {c('LP_OPEN_GLOBAL_FORM', t.openGlobalForm)}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── Registration Form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <SellerFlowHeader appName={appName} appLogo={appLogo} lang={lang} setLang={setLang} signInLabel={t.signIn} />

      {/* Page header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 py-12 px-4 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Store className="w-4 h-4" />
            {t.sellerPortal}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            {isGlobalSeller ? c('LP_GLOBAL_SELLER_REGISTRATION', t.globalSellerRegistration) : c('LP_LOCAL_SELLER_REGISTRATION', t.localSellerRegistration)}
          </h1>
          <p className="text-emerald-100 text-base max-w-md mx-auto">
            {isGlobalSeller
              ? c('LP_GLOBAL_REG_DESC', t.globalRegDesc)
              : c('LP_LOCAL_REG_DESC', t.localRegDesc)}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          type="button"
          onClick={() => setSelectedScope(null)}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
        >
          <ArrowLeft className="w-4 h-4" />
          {c('LP_BACK_TO_SELLER_TYPE', t.backToSellerType)}
        </button>

        <form onSubmit={handleRegister} className="space-y-6">

          {/* ── Seller Type Selector ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Globe2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {c('LP_SELECTED_SELLER_TYPE', t.selectedSellerType)}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isGlobalSeller
                    ? c('LP_GLOBAL_FORM_ACTIVE_DESC', t.globalFormActiveDesc)
                    : c('LP_LOCAL_FORM_ACTIVE_DESC', t.localFormActiveDesc)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-lg font-black text-gray-950">
                  {isGlobalSeller ? c('LP_GLOBAL_SELLER_FULL', t.globalSellerFull) : c('LP_LOCAL_KOREAN_SELLER', t.localKoreanSeller)}
                </div>
                <div className="text-sm text-emerald-800 mt-1">
                  {isGlobalSeller
                    ? c('LP_GLOBAL_FIELDS_ENABLED', t.globalFieldsEnabled)
                    : c('LP_LOCAL_FIELDS_ENABLED', t.localFieldsEnabled)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScope(null)}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              >
                {c('LP_CHANGE_TYPE', t.changeType)}
              </button>
            </div>
          </div>

          {/* ── Section 1: Personal Info ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('LP_PERSONAL_INFORMATION', t.personalInformation)}
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="form-label" htmlFor="fullName">{t.fullName}</label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder={t.fullNamePlaceholder}
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="form-label" htmlFor="phone">{t.phone}</label>
                <input
                  id="phone"
                  type="tel"
                  className="form-input"
                  placeholder={t.phonePlaceholder}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="form-label" htmlFor="email">{t.email}</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder={t.emailPlaceholder}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="preferredLanguage">{c('LP_PREFERRED_LANGUAGE', t.preferredLanguage)}</label>
                <select
                  id="preferredLanguage"
                  className="form-input"
                  value={form.preferredLanguage}
                  onChange={(e) => set('preferredLanguage', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="ko">한국어</option>
                  <option value="ur">Urdu</option>
                  <option value="ar">Arabic</option>
                  <option value="vi">Vietnamese</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="sellerAccountType">{c('LP_SELLER_ACCOUNT_TYPE', t.sellerAccountType)}</label>
                <select
                  id="sellerAccountType"
                  className="form-input"
                  value={form.sellerAccountType}
                  onChange={(e) => set('sellerAccountType', e.target.value)}
                >
                  <option value="INDIVIDUAL">{c('LP_INDIVIDUAL_SELLER', t.individualSeller)}</option>
                  <option value="BUSINESS">{c('LP_BUSINESS_SELLER', t.businessSeller)}</option>
                  <option value="COMPANY">{c('LP_COMPANY_SELLER', t.companySeller)}</option>
                  <option value="GLOBAL">{c('LP_GLOBAL_SELLER', t.globalSeller)}</option>
                </select>
              </div>

              <AdvancedCombobox
                id="countryOfResidence"
                label={c('LP_COUNTRY_OF_RESIDENCE', t.countryOfResidence)}
                value={form.countryOfResidence}
                options={COUNTRY_OPTIONS}
                placeholder={isGlobalSeller ? c('LP_SEARCH_OR_TYPE_COUNTRY', t.searchOrTypeCountry) : 'South Korea'}
                required
                onChange={(value) => set('countryOfResidence', value)}
              />

              <AdvancedCombobox
                id="nationality"
                label={c('LP_NATIONALITY', t.nationalityLabel)}
                value={form.nationality}
                options={NATIONALITY_OPTIONS}
                placeholder={c('LP_SEARCH_OR_TYPE_NATIONALITY', t.searchOrTypeNationality)}
                onChange={(value) => set('nationality', value)}
              />

              {/* Password */}
              <div>
                <label className="form-label" htmlFor="reg-password">{t.password}</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input pr-12"
                    placeholder={t.passwordPlaceholder}
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
                <label className="form-label" htmlFor="confirmPassword">{t.confirmPassword}</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input pr-12"
                    placeholder={t.confirmPasswordPlaceholder}
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
                  <p className="text-xs text-red-500 mt-1">{t.passwordMismatch}</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 8 && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {c('LP_PASSWORDS_MATCH', t.passwordsMatch)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 2: Representative Info ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center">
                <User className="w-4 h-4 text-cyan-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('LP_REPRESENTATIVE_INFO', t.representativeInfo)}
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="form-label" htmlFor="representativeName">{c('LP_REPRESENTATIVE_NAME', t.representativeName)}</label>
                <input
                  id="representativeName"
                  className="form-input"
                  placeholder={c('LP_REPRESENTATIVE_NAME_PLACEHOLDER', t.representativeNamePlaceholder)}
                  value={form.representativeName}
                  onChange={(e) => set('representativeName', e.target.value)}
                  required={form.sellerAccountType !== 'INDIVIDUAL'}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="dateOfBirth">{c('LP_DATE_OF_BIRTH', t.dateOfBirth)}</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  className="form-input"
                  value={form.dateOfBirth}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                />
              </div>
              {isGlobalSeller && (
                <div>
                  <label className="form-label" htmlFor="passportNumber">{c('LP_PASSPORT_NUMBER', t.passportNumber)}</label>
                  <input
                    id="passportNumber"
                    className="form-input"
                    placeholder={c('LP_PASSPORT_NUMBER_PLACEHOLDER', t.passportNumberPlaceholder)}
                    value={form.passportNumber}
                    onChange={(e) => set('passportNumber', e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="form-label" htmlFor="emergencyContact">{c('LP_EMERGENCY_CONTACT', t.emergencyContact)}</label>
                <input
                  id="emergencyContact"
                  className="form-input"
                  placeholder={c('LP_OPTIONAL_FIELD', t.optionalField)}
                  value={form.emergencyContact}
                  onChange={(e) => set('emergencyContact', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.privacyDocumentConsent}
                    onChange={(e) => set('privacyDocumentConsent', e.target.checked)}
                    required
                  />
                  <span className="text-sm text-emerald-800 leading-relaxed">
                    {c('LP_PRIVACY_DOCUMENT_CONSENT_TEXT', t.privacyDocumentConsentText)}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Section 3: Store Info ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <Store className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('LP_STORE_INFORMATION', t.storeInformation)}
              </h3>
            </div>

            <div className="space-y-5">
              {/* Store Name */}
              <div>
                <label className="form-label" htmlFor="storeName">{t.storeName}</label>
                <input
                  id="storeName"
                  type="text"
                  className={`form-input ${
                    storeNameStatus === 'available' ? 'border-green-400 focus:border-green-500' :
                    storeNameStatus === 'taken' ? 'border-red-400 focus:border-red-500' : ''
                  }`}
                  placeholder={t.storeNamePlaceholder}
                  value={form.storeName}
                  onChange={(e) => set('storeName', e.target.value)}
                  required
                />
                {storeNameStatus === 'checking' && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t.storeNameChecking}
                  </div>
                )}
                {storeNameStatus === 'available' && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {t.storeNameAvailable}
                  </p>
                )}
                {storeNameStatus === 'taken' && (
                  <div className="mt-1.5">
                    <p className="text-xs text-red-600 mb-1.5">{t.storeNameTaken}</p>
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.slice(0, 3).map((s) => (
                          <button key={s} type="button"
                            onClick={() => { set('storeName', s); setStoreNameStatus('idle'); setSuggestions([]); }}
                            className="px-2.5 py-1 rounded-lg text-xs border border-primary text-primary hover:bg-primary/10 transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Store Description */}
              <div>
                <label className="form-label" htmlFor="storeDescription">{t.storeDescription}</label>
                <textarea
                  id="storeDescription"
                  className="form-input resize-none"
                  rows={3}
                  placeholder={t.storeDescriptionPlaceholder}
                  value={form.storeDescription}
                  onChange={(e) => set('storeDescription', e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <AdvancedCombobox
                  id="storeCategory"
                  label={c('LP_STORE_CATEGORY', t.storeCategory)}
                  value={form.storeCategory}
                  options={BUSINESS_CATEGORY_OPTIONS}
                  placeholder={c('LP_STORE_CATEGORY_PLACEHOLDER', t.storeCategoryPlaceholder)}
                  required
                  onChange={(value) => set('storeCategory', value)}
                />
                <AdvancedCombobox
                  id="storeCountry"
                  label={c('LP_STORE_COUNTRY', t.storeCountry)}
                  value={isGlobalSeller ? form.countryOfResidence : 'South Korea'}
                  options={COUNTRY_OPTIONS}
                  placeholder={isGlobalSeller ? c('LP_SEARCH_OR_TYPE_COUNTRY', t.searchOrTypeCountry) : 'South Korea'}
                  readOnly={!isGlobalSeller}
                  onChange={(value) => isGlobalSeller && set('countryOfResidence', value)}
                />
              </div>
            </div>
          </div>

          {/* ── Section 4: Business Info ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('LP_BUSINESS_INFORMATION', t.businessInformation)}
              </h3>
            </div>

            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                {!isGlobalSeller ? (
                  <>
                    <div>
                      <label className="form-label" htmlFor="businessRegNumber">{c('LP_BUSINESS_REG_NUMBER', t.businessRegNumber)}</label>
                      <input
                        id="businessRegNumber"
                        type="text"
                        className="form-input"
                        placeholder={t.businessNumberPlaceholder}
                        value={form.businessRegNumber}
                        onChange={(e) => set('businessRegNumber', formatBusinessNumber(e.target.value))}
                        inputMode="numeric"
                        required={form.sellerAccountType !== 'INDIVIDUAL'}
                      />
                      <p className="text-xs text-gray-400 mt-1">{c('LP_BUSINESS_REG_NUMBER_HELP', t.businessRegNumberHelp)}</p>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="mailOrderSalesReportNumber">{c('LP_MAIL_ORDER_SALES_REPORT_NUMBER', t.mailOrderSalesReportNumber)}</label>
                      <input
                        id="mailOrderSalesReportNumber"
                        className="form-input"
                        placeholder={c('LP_MAIL_ORDER_SALES_PLACEHOLDER', t.mailOrderSalesPlaceholder)}
                        value={form.mailOrderSalesReportNumber}
                        onChange={(e) => set('mailOrderSalesReportNumber', e.target.value)}
                        required={form.sellerAccountType !== 'INDIVIDUAL'}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="form-label" htmlFor="globalBusinessLicenseNumber">{c('LP_BUSINESS_LICENSE_NUMBER', t.businessLicenseNumber)}</label>
                      <input
                        id="globalBusinessLicenseNumber"
                        className="form-input"
                        placeholder={c('LP_BUSINESS_LICENSE_PLACEHOLDER', t.businessLicensePlaceholder)}
                        value={form.globalBusinessLicenseNumber}
                        onChange={(e) => set('globalBusinessLicenseNumber', e.target.value)}
                        required
                      />
                    </div>
                    <AdvancedCombobox
                      id="countryOfIncorporation"
                      label={c('LP_COUNTRY_OF_BUSINESS_ENTITY', t.countryOfBusinessEntity)}
                      value={form.countryOfIncorporation}
                      options={COUNTRY_OPTIONS}
                      placeholder={c('LP_SEARCH_OR_TYPE_COUNTRY', t.searchOrTypeCountry)}
                      required
                      onChange={(value) => set('countryOfIncorporation', value)}
                    />
                  </>
                )}

                <div>
                  <label className="form-label" htmlFor="businessName">{c('LP_BUSINESS_NAME', t.businessName)}</label>
                  <input
                    id="businessName"
                    className="form-input"
                    placeholder={c('LP_BUSINESS_NAME_PLACEHOLDER', t.businessNamePlaceholder)}
                    value={form.businessName}
                    onChange={(e) => set('businessName', e.target.value)}
                  />
                </div>
                <AdvancedCombobox
                  id="businessType"
                  label={c('LP_BUSINESS_TYPE', t.businessType)}
                  value={form.businessType}
                  options={BUSINESS_TYPE_OPTIONS}
                  placeholder={c('LP_BUSINESS_TYPE_PLACEHOLDER', t.businessTypePlaceholder)}
                  onChange={(value) => set('businessType', value)}
                />
                <AdvancedCombobox
                  id="businessCategory"
                  label={c('LP_BUSINESS_CATEGORY', t.businessCategory)}
                  value={form.businessCategory}
                  options={BUSINESS_CATEGORY_OPTIONS}
                  placeholder={c('LP_BUSINESS_CATEGORY_PLACEHOLDER', t.businessCategoryPlaceholder)}
                  onChange={(value) => set('businessCategory', value)}
                />
                <div>
                  <label className="form-label" htmlFor="businessOpeningDate">{c('LP_BUSINESS_OPENING_DATE', t.businessOpeningDate)}</label>
                  <input
                    id="businessOpeningDate"
                    type="date"
                    className="form-input"
                    value={form.businessOpeningDate}
                    onChange={(e) => set('businessOpeningDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="businessPhone">{c('LP_BUSINESS_PHONE_NUMBER', t.businessPhoneNumber)}</label>
                  <input
                    id="businessPhone"
                    className="form-input"
                    placeholder={c('LP_BUSINESS_PHONE_PLACEHOLDER', t.businessPhonePlaceholder)}
                    value={form.businessPhone}
                    onChange={(e) => set('businessPhone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="businessEmail">{c('LP_BUSINESS_EMAIL', t.businessEmail)}</label>
                  <input
                    id="businessEmail"
                    type="email"
                    className="form-input"
                    placeholder={c('LP_BUSINESS_EMAIL_PLACEHOLDER', t.businessEmailPlaceholder)}
                    value={form.businessEmail}
                    onChange={(e) => set('businessEmail', e.target.value)}
                  />
                </div>
                {!isGlobalSeller && (
                  <>
                    <div>
                      <label className="form-label" htmlFor="taxInvoiceEmail">{c('LP_TAX_INVOICE_EMAIL', t.taxInvoiceEmail)}</label>
                      <input
                        id="taxInvoiceEmail"
                        type="email"
                        className="form-input"
                        placeholder={c('LP_TAX_INVOICE_EMAIL_PLACEHOLDER', t.taxInvoiceEmailPlaceholder)}
                        value={form.taxInvoiceEmail}
                        onChange={(e) => set('taxInvoiceEmail', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="vatStatus">{c('LP_VAT_STATUS', t.vatStatus)}</label>
                      <select
                        id="vatStatus"
                        className="form-input"
                        value={form.vatStatus}
                        onChange={(e) => set('vatStatus', e.target.value)}
                      >
                        <option value="">{c('LP_SELECT_VAT_STATUS', t.selectVatStatus)}</option>
                        <option value="GENERAL">{c('LP_VAT_GENERAL', t.vatGeneral)}</option>
                        <option value="SIMPLIFIED">{c('LP_VAT_SIMPLIFIED', t.vatSimplified)}</option>
                        <option value="EXEMPT">{c('LP_VAT_EXEMPT', t.vatExempt)}</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="form-label" htmlFor="address">
                  {isGlobalSeller ? c('LP_BUSINESS_ADDRESS', t.businessAddress) : c('LP_ADDRESS', t.address)}
                </label>
                {!isGlobalSeller ? (
                  <div className="flex gap-2">
                    <input
                      id="address"
                      type="text"
                      className="form-input flex-1 bg-gray-50 cursor-pointer"
                      placeholder={t.addressPlaceholder}
                      value={form.address}
                      readOnly
                      onClick={openKakaoPostcode}
                    />
                    <button
                      type="button"
                      onClick={openKakaoPostcode}
                      className="btn-secondary flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                    >
                      <MapPin className="w-4 h-4" />
                      {t.searchAddress}
                    </button>
                  </div>
                ) : (
                  <textarea
                    id="address"
                    className="form-input resize-none"
                    rows={3}
                    placeholder={c('LP_GLOBAL_ADDRESS_PLACEHOLDER', t.globalAddressPlaceholder)}
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    required
                  />
                )}
              </div>

              {/* Detail Address */}
              {form.address && (
                <div>
                  <label className="form-label" htmlFor="detailAddress">{t.detailAddress}</label>
                  <input
                    id="detailAddress"
                    type="text"
                    className="form-input"
                    placeholder={t.detailAddressPlaceholder}
                    value={form.detailAddress}
                    onChange={(e) => set('detailAddress', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Section 5: Required Documents ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                <UploadCloud className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {isGlobalSeller ? c('LP_GLOBAL_SELLER_DOCUMENTS', t.globalSellerDocuments) : c('LP_KOREAN_SELLER_DOCUMENTS', t.koreanSellerDocuments)}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {c('LP_DOCUMENT_UPLOAD_HELP', t.documentUploadHelp)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {requiredDocuments.map((document) => {
                const uploaded = documentUploads[document.key];
                const uploading = uploadingDocument === document.key;
                return (
                  <div key={document.key} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{document.title}</span>
                          {document.required && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{c('LP_REQUIRED_BADGE', t.requiredBadge)}</span>
                          )}
                        </div>
                        {document.korean && <p className="text-sm text-gray-500 mt-1">{document.korean}</p>}
                        {uploaded && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {uploaded.originalFileName}
                          </p>
                        )}
                      </div>
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                        {uploaded ? c('LP_REPLACE_FILE', t.replaceFile) : c('LP_UPLOAD_FILE', t.uploadFile)}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={(e) => handleDocumentUpload(document.key, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 5: Settlement and Bank Info ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <Landmark className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('LP_SETTLEMENT_BANK_INFO', t.settlementBankInfo)}
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <AdvancedCombobox
                id="bankCountry"
                label={c('LP_BANK_COUNTRY', t.bankCountry)}
                value={form.bankCountry}
                options={COUNTRY_OPTIONS}
                placeholder={isGlobalSeller ? c('LP_SEARCH_OR_TYPE_COUNTRY', t.searchOrTypeCountry) : 'South Korea'}
                required
                onChange={(value) => set('bankCountry', value)}
              />
              <div>
                <label className="form-label" htmlFor="bankName">{c('LP_BANK_NAME', t.bankName)}</label>
                <input
                  id="bankName"
                  className="form-input"
                  placeholder={c('LP_BANK_NAME_PLACEHOLDER', t.bankNamePlaceholder)}
                  value={form.bankName}
                  onChange={(e) => set('bankName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="accountHolderName">{c('LP_ACCOUNT_HOLDER_NAME', t.accountHolderName)}</label>
                <input
                  id="accountHolderName"
                  className="form-input"
                  placeholder={c('LP_ACCOUNT_HOLDER_PLACEHOLDER', t.accountHolderPlaceholder)}
                  value={form.accountHolderName}
                  onChange={(e) => set('accountHolderName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="accountNumber">{c('LP_ACCOUNT_NUMBER', t.accountNumber)}</label>
                <input
                  id="accountNumber"
                  className="form-input"
                  placeholder={c('LP_ACCOUNT_NUMBER_PLACEHOLDER', t.accountNumberPlaceholder)}
                  value={form.accountNumber}
                  onChange={(e) => set('accountNumber', e.target.value)}
                  required
                />
              </div>
              {isGlobalSeller && (
                <>
                  <div>
                    <label className="form-label" htmlFor="swiftCode">{c('LP_SWIFT_CODE', t.swiftCode)}</label>
                    <input
                      id="swiftCode"
                      className="form-input"
                      placeholder={c('LP_SWIFT_CODE_PLACEHOLDER', t.swiftCodePlaceholder)}
                      value={form.swiftCode}
                      onChange={(e) => set('swiftCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="bankAddress">{c('LP_BANK_ADDRESS', t.bankAddress)}</label>
                    <input
                      id="bankAddress"
                      className="form-input"
                      placeholder={c('LP_BANK_ADDRESS_PLACEHOLDER', t.bankAddressPlaceholder)}
                      value={form.bankAddress}
                      onChange={(e) => set('bankAddress', e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="form-label" htmlFor="settlementCurrency">{c('LP_SETTLEMENT_CURRENCY', t.settlementCurrency)}</label>
                <select
                  id="settlementCurrency"
                  className="form-input"
                  value={form.settlementCurrency}
                  onChange={(e) => set('settlementCurrency', e.target.value)}
                >
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="PKR">PKR</option>
                  <option value="VND">VND</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="settlementCycle">{c('LP_SETTLEMENT_CYCLE', t.settlementCycle)}</label>
                <select
                  id="settlementCycle"
                  className="form-input"
                  value={form.settlementCycle}
                  onChange={(e) => set('settlementCycle', e.target.value)}
                >
                  <option value="WEEKLY">{c('LP_WEEKLY_SETTLEMENT', t.weeklySettlement)}</option>
                  <option value="MONTHLY">{c('LP_MONTHLY_SETTLEMENT', t.monthlySettlement)}</option>
                  <option value="CUSTOM">{c('LP_CUSTOM_SETTLEMENT', t.customSettlement)}</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Section 6: Required Agreements ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {c('LP_REQUIRED_AGREEMENTS', t.requiredAgreements)}
              </h3>
            </div>

            <div className="space-y-3">
              {([
                ['sellerTerms', c('LP_AGREEMENT_SELLER_TERMS', t.agreementSellerTerms)],
                ['privacyPolicy', c('LP_AGREEMENT_PRIVACY_POLICY', t.agreementPrivacyPolicy)],
                ['personalInfo', c('LP_AGREEMENT_PERSONAL_INFO', t.agreementPersonalInfo)],
                ['businessDocuments', c('LP_AGREEMENT_BUSINESS_DOCS', t.agreementBusinessDocs)],
                ['sellerNotices', c('LP_AGREEMENT_SELLER_NOTICES', t.agreementSellerNotices)],
                ['trueInfo', c('LP_AGREEMENT_TRUE_INFO', t.agreementTrueInfo)],
                ['falseInfo', c('LP_AGREEMENT_FALSE_INFO', t.agreementFalseInfo)],
                ['prohibitedProducts', c('LP_AGREEMENT_PROHIBITED_PRODUCTS', t.agreementProhibitedProducts)],
                ['commissionPolicy', c('LP_AGREEMENT_COMMISSION_POLICY', t.agreementCommissionPolicy)],
                ['returnPolicy', c('LP_AGREEMENT_RETURN_POLICY', t.agreementReturnPolicy)],
              ] as const).map(([key, label]) => (
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
                {c('LP_APPROVAL_PROCESS', t.approvalProcess)}
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                {c('LP_APPROVAL_PROCESS_DESC', t.approvalProcessDesc)}
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || storeNameStatus === 'taken'}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.registering}
              </span>
            ) : (
              t.registerButton
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t.alreadyHaveAccount}{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {t.signIn}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
