'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ShoppingBag, Smartphone, Zap, TrendingUp, ArrowRight, Download,
  Star, Shield, Truck, ChevronDown, Globe,
  MessageCircle, Mail, Phone, CheckCircle,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────── */
interface CMS { [key: string]: string }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/* ─── Fade-in on scroll component ────────────────────────────────────── */
function FadeIn({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode; className?: string; delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const initial: any = { opacity: 0 };
  const animate: any = isInView ? { opacity: 1 } : {};
  if (direction === 'up')    { initial.y = 40; animate.y = 0; }
  if (direction === 'down')  { initial.y = -40; animate.y = 0; }
  if (direction === 'left')  { initial.x = 40; animate.x = 0; }
  if (direction === 'right') { initial.x = -40; animate.x = 0; }

  return (
    <motion.div ref={ref} initial={initial} animate={animate}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Counter animation ──────────────────────────────────────────────── */
function AnimatedCount({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');
  const num = parseInt(value.replace(/[^0-9]/g, '')) || 0;

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = num;
    const duration = 2000;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { start = end; clearInterval(timer); }
      setDisplay(start.toLocaleString());
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, num]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Service icon mapping ───────────────────────────────────────────── */
const SERVICE_ICONS: Record<string, any> = {
  shopping: ShoppingBag, grocery: ShoppingBag,
  sim: Smartphone, phone: Smartphone, mobile: Smartphone,
  topup: Zap, recharge: Zap, flash: Zap,
  exchange: TrendingUp, rate: TrendingUp, money: TrendingUp,
  delivery: Truck, shipping: Truck,
  global: Globe, international: Globe,
};

function getServiceIcon(iconKey: string) {
  const lower = (iconKey || '').toLowerCase();
  for (const [key, Icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Star;
}

const SERVICE_COLORS = [
  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
];

/* ─── Animated Map Background — realistic delivery scene ──────────────── */
function DeliveryMapAnimation({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Road texture */}
          <pattern id="roadLines" patternUnits="userSpaceOnUse" width="20" height="4" patternTransform="rotate(0)">
            <rect width="12" height="2" y="1" fill="rgba(255,255,255,0.35)" rx="1"/>
          </pattern>
          {/* Tree gradient */}
          <radialGradient id="treeGrad" cx="50%" cy="40%"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.5"/><stop offset="100%" stopColor="#15803d" stopOpacity="0.3"/></radialGradient>
          {/* Building gradient */}
          <linearGradient id="bldg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={primaryColor} stopOpacity="0.12"/><stop offset="100%" stopColor={primaryColor} stopOpacity="0.04"/></linearGradient>
          <linearGradient id="bldg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.10"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0.03"/></linearGradient>
          <linearGradient id="bldg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.10"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.03"/></linearGradient>
          {/* Ground */}
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.5"/><stop offset="100%" stopColor="#ecfdf5" stopOpacity="0.2"/></linearGradient>
        </defs>

        {/* Ground layer */}
        <rect width="1440" height="800" fill="url(#ground)"/>

        {/* Grid streets — horizontal */}
        <rect x="0" y="340" width="1440" height="28" rx="3" fill="#d1d5db" opacity="0.25"/>
        <rect x="0" y="346" width="1440" height="16" rx="2" fill="#9ca3af" opacity="0.18"/>
        <rect x="0" y="351" width="1440" height="6" fill="url(#roadLines)"/>

        <rect x="0" y="560" width="1440" height="22" rx="3" fill="#d1d5db" opacity="0.2"/>
        <rect x="0" y="565" width="1440" height="12" rx="2" fill="#9ca3af" opacity="0.15"/>
        <rect x="0" y="569" width="1440" height="4" fill="url(#roadLines)"/>

        {/* Grid streets — vertical */}
        <rect x="350" y="0" width="22" height="800" rx="3" fill="#d1d5db" opacity="0.2"/>
        <rect x="355" y="0" width="12" height="800" rx="2" fill="#9ca3af" opacity="0.15"/>

        <rect x="750" y="0" width="26" height="800" rx="3" fill="#d1d5db" opacity="0.22"/>
        <rect x="756" y="0" width="14" height="800" rx="2" fill="#9ca3af" opacity="0.16"/>

        <rect x="1100" y="0" width="20" height="800" rx="3" fill="#d1d5db" opacity="0.18"/>
        <rect x="1104" y="0" width="12" height="800" rx="2" fill="#9ca3af" opacity="0.13"/>

        {/* Building blocks — city-like grid */}
        {/* Block 1 — top-left */}
        <rect x="80" y="120" width="90" height="130" rx="6" fill="url(#bldg1)" stroke={primaryColor} strokeOpacity="0.08" strokeWidth="1"/>
        <rect x="85" y="125" width="20" height="16" rx="2" fill={primaryColor} opacity="0.08"/>
        <rect x="115" y="125" width="20" height="16" rx="2" fill={primaryColor} opacity="0.08"/>
        <rect x="145" y="125" width="20" height="16" rx="2" fill={primaryColor} opacity="0.08"/>
        <rect x="85" y="150" width="20" height="16" rx="2" fill={primaryColor} opacity="0.06"/>
        <rect x="115" y="150" width="20" height="16" rx="2" fill={primaryColor} opacity="0.06"/>
        <rect x="145" y="150" width="20" height="16" rx="2" fill={primaryColor} opacity="0.06"/>

        <rect x="200" y="80" width="70" height="170" rx="6" fill="url(#bldg2)" stroke="#6366f1" strokeOpacity="0.06" strokeWidth="1"/>
        <rect x="206" y="86" width="14" height="12" rx="1.5" fill="#6366f1" opacity="0.07"/>
        <rect x="226" y="86" width="14" height="12" rx="1.5" fill="#6366f1" opacity="0.07"/>
        <rect x="246" y="86" width="14" height="12" rx="1.5" fill="#6366f1" opacity="0.07"/>

        {/* Block 2 — top-center */}
        <rect x="420" y="100" width="120" height="150" rx="8" fill="url(#bldg1)" stroke={primaryColor} strokeOpacity="0.06" strokeWidth="1"/>
        <rect x="560" y="140" width="80" height="110" rx="6" fill="url(#bldg3)" stroke="#f59e0b" strokeOpacity="0.06" strokeWidth="1"/>
        <rect x="660" y="110" width="60" height="140" rx="5" fill="url(#bldg2)" stroke="#6366f1" strokeOpacity="0.06" strokeWidth="1"/>

        {/* Block 3 — right side */}
        <rect x="820" y="80" width="100" height="170" rx="6" fill="url(#bldg1)"/>
        <rect x="940" y="120" width="70" height="130" rx="5" fill="url(#bldg3)"/>
        <rect x="1030" y="90" width="50" height="160" rx="4" fill="url(#bldg2)"/>

        {/* Block 4 — middle row between roads */}
        <rect x="100" y="400" width="110" height="100" rx="6" fill="url(#bldg3)"/>
        <rect x="240" y="420" width="80" height="80" rx="5" fill="url(#bldg1)"/>
        <rect x="420" y="390" width="140" height="120" rx="7" fill="url(#bldg2)"/>
        <rect x="600" y="410" width="100" height="90" rx="5" fill="url(#bldg3)"/>
        <rect x="830" y="395" width="120" height="110" rx="6" fill="url(#bldg1)"/>
        <rect x="980" y="415" width="90" height="90" rx="5" fill="url(#bldg2)"/>

        {/* Block 5 — bottom */}
        <rect x="60" y="620" width="130" height="100" rx="7" fill="url(#bldg1)"/>
        <rect x="230" y="640" width="90" height="80" rx="5" fill="url(#bldg2)"/>
        <rect x="420" y="610" width="100" height="110" rx="6" fill="url(#bldg3)"/>
        <rect x="800" y="625" width="110" height="95" rx="6" fill="url(#bldg1)"/>
        <rect x="1150" y="610" width="130" height="110" rx="7" fill="url(#bldg2)"/>

        {/* Trees (scattered along roads) */}
        {[140,310,500,680,900,1050,1200].map(x => (
          <g key={`t1-${x}`}><circle cx={x} cy={310} r="14" fill="url(#treeGrad)"/><circle cx={x+8} cy={305} r="10" fill="url(#treeGrad)"/></g>
        ))}
        {[180,400,600,850,1000,1280].map(x => (
          <g key={`t2-${x}`}><circle cx={x} cy={535} r="12" fill="url(#treeGrad)"/><circle cx={x+6} cy={530} r="9" fill="url(#treeGrad)"/></g>
        ))}

        {/* Location pins */}
        {/* Pin at customer door — destination */}
        <g className="animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
          <path d="M1220 310 c0-14 12-26 26-26 14 0 26 12 26 26 0 18-26 38-26 38s-26-20-26-38z"
            fill="#ef4444" opacity="0.7"/>
          <circle cx="1246" cy="310" r="8" fill="white" opacity="0.9"/>
        </g>
        {/* Pin at warehouse — origin */}
        <g opacity="0.5">
          <path d="M100 320 c0-12 10-22 22-22 12 0 22 10 22 22 0 16-22 32-22 32s-22-16-22-32z"
            fill={primaryColor}/>
          <circle cx="122" cy="320" r="7" fill="white" opacity="0.9"/>
        </g>

        {/* Delivery route — dashed path showing the route */}
        <path d="M140 354 L750 354" stroke={primaryColor} strokeWidth="3" strokeDasharray="8 6" opacity="0.15">
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.5s" repeatCount="indefinite"/>
        </path>
        <path d="M763 354 L763 200" stroke={primaryColor} strokeWidth="3" strokeDasharray="8 6" opacity="0.15">
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.5s" repeatCount="indefinite"/>
        </path>
        <path d="M763 200 L1100 200" stroke={primaryColor} strokeWidth="3" strokeDasharray="8 6" opacity="0.15">
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.5s" repeatCount="indefinite"/>
        </path>
        <path d="M1110 200 L1110 320" stroke={primaryColor} strokeWidth="3" strokeDasharray="8 6" opacity="0.15">
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.5s" repeatCount="indefinite"/>
        </path>
        <path d="M1110 320 L1230 320" stroke={primaryColor} strokeWidth="3" strokeDasharray="8 6" opacity="0.15">
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.5s" repeatCount="indefinite"/>
        </path>

        {/* ════ DELIVERY TRUCK ════ */}
        {/* Phase 1: go right on main road */}
        <g>
          <animateMotion dur="14s" repeatCount="indefinite"
            path="M140,348 L750,348 L755,348 L760,340 L760,200 L765,195 L1100,195 L1105,200 L1105,320 L1110,325 L1230,325"
            rotate="auto" keyPoints="0;0.45;0.45;0.55;0.55;0.7;0.7;0.85;0.85;1;1" keyTimes="0;0.35;0.36;0.48;0.49;0.65;0.66;0.78;0.79;0.92;1" calcMode="linear"/>
          {/* Truck body */}
          <rect x="-28" y="-12" width="36" height="22" rx="4" fill={primaryColor} opacity="0.85"/>
          {/* Cargo area */}
          <rect x="-28" y="-11" width="22" height="20" rx="3" fill="white" opacity="0.3"/>
          {/* Cab */}
          <rect x="-2" y="-8" width="14" height="16" rx="3" fill={primaryColor}/>
          {/* Windshield */}
          <rect x="0" y="-6" width="10" height="8" rx="2" fill="#bfdbfe" opacity="0.8"/>
          {/* Wheels */}
          <circle cx="-18" cy="12" r="5" fill="#374151" opacity="0.7"/>
          <circle cx="-18" cy="12" r="2.5" fill="#6b7280" opacity="0.5"/>
          <circle cx="4" cy="12" r="5" fill="#374151" opacity="0.7"/>
          <circle cx="4" cy="12" r="2.5" fill="#6b7280" opacity="0.5"/>
          {/* Package icon on truck */}
          <rect x="-22" y="-5" width="10" height="8" rx="1.5" fill={primaryColor} opacity="0.4" stroke="white" strokeWidth="0.5" strokeOpacity="0.5"/>
          <line x1="-17" y1="-5" x2="-17" y2="3" stroke="white" strokeWidth="0.5" opacity="0.4"/>
          <line x1="-22" y1="-1" x2="-12" y2="-1" stroke="white" strokeWidth="0.5" opacity="0.4"/>
        </g>

        {/* ════ SECOND VEHICLE — smaller, different route ════ */}
        <g opacity="0.5">
          <animateMotion dur="18s" repeatCount="indefinite"
            path="M1300,565 L400,565 L395,560 L390,420 L385,415 L100,415"
            rotate="auto" keyPoints="0;0.55;0.56;0.75;0.76;1" keyTimes="0;0.5;0.51;0.72;0.73;1" calcMode="linear"/>
          <rect x="-20" y="-9" width="28" height="17" rx="3" fill="#6366f1" opacity="0.7"/>
          <rect x="-20" y="-8" width="16" height="15" rx="2" fill="white" opacity="0.25"/>
          <rect x="0" y="-6" width="10" height="12" rx="2" fill="#6366f1" opacity="0.8"/>
          <rect x="2" y="-4" width="6" height="6" rx="1.5" fill="#bfdbfe" opacity="0.7"/>
          <circle cx="-12" cy="9" r="4" fill="#374151" opacity="0.6"/>
          <circle cx="4" cy="9" r="4" fill="#374151" opacity="0.6"/>
        </g>

        {/* ════ THIRD VEHICLE — motorcycle/bike ════ */}
        <g opacity="0.35">
          <animateMotion dur="10s" repeatCount="indefinite"
            path="M360,150 L360,330 L355,340 L355,550 L350,560 L350,750"
            rotate="auto" calcMode="linear"/>
          <circle cx="0" cy="0" r="6" fill="#f59e0b"/>
          <circle cx="0" cy="8" r="4" fill="#374151" opacity="0.6"/>
          <rect x="-3" y="-10" width="6" height="8" rx="2" fill="#f59e0b" opacity="0.8"/>
        </g>

        {/* Subtle package being delivered — pulsing at destination */}
        <g>
          <rect x="1236" y="360" width="20" height="16" rx="3" fill="#fbbf24" opacity="0.25">
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="2.5s" repeatCount="indefinite"/>
          </rect>
          <rect x="1240" y="363" width="12" height="10" rx="2" fill="#f59e0b" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2.5s" repeatCount="indefinite"/>
          </rect>
        </g>

      </svg>

      {/* Soft overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/70" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN LANDING PAGE — all content from Admin Panel CMS                 */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [cms, setCms] = useState<CMS>({});
  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.05], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']);
  const headerShadow = useTransform(scrollYProgress, [0, 0.05], ['0 0 0 transparent', '0 1px 20px rgba(0,0,0,0.08)']);

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then(r => r.json())
      .then(data => setCms(data || {}))
      .catch(() => {});
  }, []);

  // CMS getter with default
  const g = (key: string, fallback: string) => cms[key] || fallback;
  const appName = g('APP_NAME', 'AM Mart');
  const appLogo = cms['APP_LOGO'] || '';
  const primaryColor = g('PRIMARY_COLOR', '#10B981');

  // ── Hero ──
  const heroTitle = g('LP_HERO_TITLE', 'Everything You Need, Delivered');
  const heroSubtitle = g('LP_HERO_SUBTITLE', 'Shop groceries, recharge phones, get SIM cards, and compare exchange rates — all from one powerful app.');
  const heroCta1 = g('LP_HERO_CTA_PRIMARY', 'Download App');
  const heroCta2 = g('LP_HERO_CTA_SECONDARY', 'Learn More');

  // ── Stats ──
  const stats = [
    { value: g('LP_STATS_CUSTOMERS', '10000'), label: 'Happy Customers', suffix: '+' },
    { value: g('LP_STATS_PRODUCTS', '5000'), label: 'Products', suffix: '+' },
    { value: g('LP_STATS_SELLERS', '200'), label: 'Trusted Sellers', suffix: '+' },
    { value: g('LP_STATS_DELIVERIES', '50000'), label: 'Deliveries Made', suffix: '+' },
  ];

  // ── Services ──
  const services = [1, 2, 3, 4].map((i) => ({
    title: g(`LP_SERVICE_${i}_TITLE`, ['Grocery Shopping', 'Mobile Top-Up', 'SIM Cards', 'Exchange Rates'][i - 1]),
    desc: g(`LP_SERVICE_${i}_DESC`, [
      'Fresh produce, meat, dairy, and household essentials delivered to your door.',
      'Instant mobile recharge for any carrier, local or international.',
      'Browse and reserve phone numbers. Pick your perfect last 4 digits.',
      'Compare real-time exchange rates from multiple providers to get the best deal.',
    ][i - 1]),
    icon: g(`LP_SERVICE_${i}_ICON`, ['shopping', 'topup', 'sim', 'exchange'][i - 1]),
  }));

  // ── Why choose us ──
  const whyTitle = g('LP_WHY_TITLE', 'Why Choose Us');
  const whySubtitle = g('LP_WHY_SUBTITLE', 'Built for convenience, designed for trust');
  const features = [1, 2, 3].map((i) => ({
    title: g(`LP_FEATURE_${i}_TITLE`, ['Fast & Reliable', 'Secure Payments', '24/7 Support'][i - 1]),
    desc: g(`LP_FEATURE_${i}_DESC`, [
      'Get your orders delivered quickly with real-time tracking.',
      'Your transactions are protected with bank-grade security.',
      'Our support team is always here to help you.',
    ][i - 1]),
  }));
  const featureIcons = [Truck, Shield, MessageCircle];

  // ── How it works ──
  const stepsTitle = g('LP_STEPS_TITLE', 'How It Works');
  const steps = [1, 2, 3].map((i) => ({
    title: g(`LP_STEP_${i}_TITLE`, ['Download the App', 'Browse & Order', 'Get it Delivered'][i - 1]),
    desc: g(`LP_STEP_${i}_DESC`, [
      'Available on Android and iOS. Quick setup, no hassle.',
      'Explore products, services, and deals curated for you.',
      'Sit back and relax. We handle the rest.',
    ][i - 1]),
  }));

  // ── Testimonials ──
  const testimonials = [1, 2, 3].map((i) => ({
    quote: g(`LP_TESTIMONIAL_${i}_QUOTE`, [
      'The best delivery app I\'ve ever used. Fresh products every time!',
      'SIM card ordering is so easy. Love the number selection feature!',
      'Exchange rates comparison saved me so much money. Highly recommend!',
    ][i - 1]),
    name: g(`LP_TESTIMONIAL_${i}_NAME`, ['Sarah K.', 'Ahmed M.', 'Ji-Young P.'][i - 1]),
    company: g(`LP_TESTIMONIAL_${i}_COMPANY`, ['Customer', 'Customer', 'Customer'][i - 1]),
  }));

  // ── Download ──
  const downloadTitle = g('LP_DOWNLOAD_TITLE', 'Download the App Now');
  const downloadSubtitle = g('LP_DOWNLOAD_SUBTITLE', 'Available on Android and iOS. Start shopping in minutes.');
  const playStoreUrl = g('LP_PLAY_STORE_URL', '#');
  const appStoreUrl = g('LP_APP_STORE_URL', '#');
  const qrAndroid = cms['LP_QR_ANDROID'] || '';
  const qrIos = cms['LP_QR_IOS'] || '';

  // ── Support / Footer ──
  const supportTitle = g('LP_SUPPORT_TITLE', 'Need Help?');
  const supportDesc = g('LP_SUPPORT_DESC', 'Our support team is available around the clock to assist you.');
  const supportEmail = g('SUPPORT_EMAIL', 'support@ammart.com');
  const supportPhone = g('SUPPORT_PHONE', '+82-2-1234-5678');
  const footerText = g('LP_FOOTER_TEXT', appName + ' — Your trusted marketplace for groceries, mobile services, and more.');
  const footerCopyright = g('LP_FOOTER_COPYRIGHT', `© ${new Date().getFullYear()} ${appName}. All rights reserved.`);

  // ── Nav labels ──
  const navFeatures = g('LP_NAV_FEATURES', 'Services');
  const navHow = g('LP_NAV_HOW_IT_WORKS', 'How It Works');
  const navTestimonials = g('LP_NAV_TESTIMONIALS', 'Reviews');
  const navContact = g('LP_NAV_CONTACT', 'Contact');

  // ── Hero background ──
  const heroBgType = g('LP_HERO_BG_TYPE', 'animation'); // 'animation' | 'image' | 'video' | 'none'
  const heroBgImage = cms['LP_HERO_BG_IMAGE'] || '';
  const heroBgVideo = cms['LP_HERO_BG_VIDEO'] || '';

  // ── Screenshots ──
  const screenshot1 = cms['LP_APP_SCREENSHOT_1'] || '';

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ═══════════════ FIXED HEADER ═══════════════ */}
      <motion.header
        style={{ backgroundColor: headerBg, boxShadow: headerShadow }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt={appName} className="h-9 w-auto object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaryColor }}>
                {appName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-lg hidden sm:block">{appName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: navFeatures, id: 'services' },
              { label: navHow, id: 'how-it-works' },
              { label: navTestimonials, id: 'reviews' },
              { label: navContact, id: 'contact' },
            ].map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {item.label}
              </button>
            ))}
          </nav>
          <button onClick={() => scrollTo('download')}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
            style={{ backgroundColor: primaryColor }}>
            {heroCta1}
          </button>
        </div>
      </motion.header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Dynamic background — admin can switch between animation/image/video/none */}
        <div className="absolute inset-0 -z-10">
          {heroBgType === 'animation' && <DeliveryMapAnimation primaryColor={primaryColor} />}
          {heroBgType === 'image' && heroBgImage && (
            <div className="absolute inset-0">
              <img src={heroBgImage} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-white/70" />
            </div>
          )}
          {heroBgType === 'video' && heroBgVideo && (
            <div className="absolute inset-0">
              <video autoPlay muted loop playsInline className="w-full h-full object-cover">
                <source src={heroBgVideo} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-white/70" />
            </div>
          )}
          {heroBgType === 'none' && (
            <>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-15"
                style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
              <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-sm font-medium text-gray-700 mb-6">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                  Available on Android &amp; iOS
                </div>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
                  {heroTitle.split(' ').map((word, i, arr) =>
                    i >= arr.length - 2
                      ? <span key={i} style={{ color: primaryColor }}>{word} </span>
                      : <span key={i}>{word} </span>
                  )}
                </h1>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">{heroSubtitle}</p>
              </FadeIn>
              <FadeIn delay={0.3}>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => scrollTo('download')}
                    className="group px-7 py-3.5 rounded-full text-white font-semibold text-base flex items-center gap-2 transition-all hover:scale-105 hover:shadow-xl"
                    style={{ backgroundColor: primaryColor }}>
                    <Download className="w-5 h-5" /> {heroCta1}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button onClick={() => scrollTo('services')}
                    className="px-7 py-3.5 rounded-full border-2 border-gray-200 font-semibold text-base hover:border-gray-400 transition-all">
                    {heroCta2}
                  </button>
                </div>
              </FadeIn>
            </div>

            {/* Phone mockup */}
            <FadeIn direction="right" delay={0.3}>
              <div className="relative flex justify-center">
                <div className="relative">
                  <div className="w-[280px] h-[560px] rounded-[3rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-900 rounded-b-2xl z-10" />
                    {screenshot1 ? (
                      <img src={screenshot1} alt="App Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white p-6"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, #1a1a2e)` }}>
                        {appLogo ? (
                          <img src={appLogo} alt={appName} className="w-24 h-24 object-contain mb-4" />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                            <span className="text-3xl font-bold">{appName.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <p className="text-xl font-bold">{appName}</p>
                        <p className="text-sm text-white/70 mt-1">{g('APP_TAGLINE', 'Your trusted marketplace')}</p>
                      </div>
                    )}
                  </div>
                  {/* Floating badges */}
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -left-16 top-20 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Order Delivered</p>
                      <p className="text-[10px] text-gray-500">Just now</p>
                    </div>
                  </motion.div>
                  <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -right-12 bottom-32 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Top-Up Success</p>
                      <p className="text-[10px] text-gray-500">Instant recharge</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </motion.div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="py-16 border-y border-gray-100" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}03)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-extrabold" style={{ color: primaryColor }}>
                    <AnimatedCount value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-sm text-gray-600 mt-1 font-medium">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SERVICES ═══════════════ */}
      <section id="services" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Our Services</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">
                {g('LP_MARKET_TITLE', 'One App, Everything You Need')}
              </h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
                {g('LP_MARKET_SUBTITLE', 'From daily groceries to mobile services, we\'ve got you covered.')}
              </p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc, i) => {
              const Icon = getServiceIcon(svc.icon);
              const color = SERVICE_COLORS[i % SERVICE_COLORS.length];
              return (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className={`p-6 rounded-2xl border ${color.border} ${color.bg} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full`}>
                    <div className={`w-12 h-12 rounded-xl ${color.bg} ${color.text} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{svc.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY CHOOSE US ═══════════════ */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Why Choose Us</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">{whyTitle}</h2>
              <p className="text-gray-600 mt-4 max-w-xl mx-auto">{whySubtitle}</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feat, i) => {
              const Icon = featureIcons[i];
              return (
                <FadeIn key={i} delay={i * 0.15}>
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center">
                    <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5"
                      style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Simple Steps</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">{stepsTitle}</h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-0.5 bg-gray-200" />
            {steps.map((step, i) => (
              <FadeIn key={i} delay={i * 0.2}>
                <div className="text-center relative">
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white font-bold text-xl mb-5 relative z-10 shadow-lg"
                    style={{ backgroundColor: primaryColor }}>
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section id="reviews" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Testimonials</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">What Our Customers Say</h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: primaryColor }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.company}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ DOWNLOAD ═══════════════ */}
      <section id="download" className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 -z-10"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }} />
        <div className="absolute inset-0 -z-10 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{downloadTitle}</h2>
            <p className="text-white/80 max-w-xl mx-auto mb-12 text-lg">{downloadSubtitle}</p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-12">
              {/* Android */}
              <div className="flex flex-col items-center gap-4">
                {qrAndroid && (
                  <div className="bg-white p-3 rounded-2xl shadow-lg">
                    <img src={qrAndroid} alt="Android QR Code" className="w-40 h-40 object-contain" />
                  </div>
                )}
                <a href={playStoreUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 transition-all hover:scale-105">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.144 1.24a1 1 0 0 1 0 1.732l-2.144 1.24-2.53-2.53 2.53-2.53-.001.001zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider text-white/70">Get it on</p>
                    <p className="font-semibold text-base -mt-0.5">Google Play</p>
                  </div>
                </a>
              </div>

              {/* iOS */}
              <div className="flex flex-col items-center gap-4">
                {qrIos && (
                  <div className="bg-white p-3 rounded-2xl shadow-lg">
                    <img src={qrIos} alt="iOS QR Code" className="w-40 h-40 object-contain" />
                  </div>
                )}
                <a href={appStoreUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 transition-all hover:scale-105">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider text-white/70">Download on the</p>
                    <p className="font-semibold text-base -mt-0.5">App Store</p>
                  </div>
                </a>
              </div>
            </div>
          </FadeIn>

          {!qrAndroid && !qrIos && (
            <FadeIn delay={0.3}>
              <p className="text-white/50 text-sm">QR codes can be uploaded from the Admin Panel &rarr; Landing Page settings</p>
            </FadeIn>
          )}
        </div>
      </section>

      {/* ═══════════════ CONTACT ═══════════════ */}
      <section id="contact" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{supportTitle}</h2>
              <p className="text-gray-600 mb-10">{supportDesc}</p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a href={`mailto:${supportEmail}`}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow transition-all">
                  <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="font-medium text-sm">{supportEmail}</span>
                </a>
                <a href={`tel:${supportPhone}`}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow transition-all">
                  <Phone className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="font-medium text-sm">{supportPhone}</span>
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-gray-100 py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {appLogo ? (
                <img src={appLogo} alt={appName} className="h-8 w-auto object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: primaryColor }}>
                  {appName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-600">{footerText}</span>
            </div>
            <p className="text-xs text-gray-400">{footerCopyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
