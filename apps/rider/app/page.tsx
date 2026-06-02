'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bike, MapPin, TrendingUp, Users, Star, ArrowRight,
  CheckCircle, Zap, HeadphonesIcon, ChevronDown, Menu, X,
  MessageCircle, Clock, Navigation, Shield, DollarSign, Route,
  Truck, BarChart3,
} from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── Scroll Animation Hook ────────────────────────────────────────────────────
function useScrollAnimation() {
  useEffect(() => {
    const els = document.querySelectorAll('.scroll-animate');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Hero Illustration (Rider-themed) ────────────────────────────────────────
function HeroIllustration({ c, t }: { c: (k: string, f: string) => string; t: any }) {
  return (
    <div className="relative w-full max-w-[480px] mx-auto h-[480px] flex items-center justify-center">
      {/* Orbit ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[340px] h-[340px] rounded-full border-2 border-dashed border-blue-200 animate-spin-slow opacity-60" />
      </div>

      {/* Morphing blob background */}
      <div className="absolute w-64 h-64 bg-gradient-to-br from-blue-100 to-sky-100 animate-morph opacity-60 rounded-full" />

      {/* Phone frame */}
      <div className="relative z-10 animate-float" style={{ animationDuration: '4s' }}>
        <div className="w-36 h-60 bg-white rounded-3xl shadow-2xl border-4 border-gray-200 relative overflow-hidden">
          {/* Phone screen */}
          <div className="absolute inset-1 bg-gradient-to-b from-blue-50 to-white rounded-2xl overflow-hidden">
            {/* Status bar */}
            <div className="h-4 bg-blue-500 flex items-center justify-end px-2">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
            {/* App content — map-like */}
            <div className="p-2 space-y-1.5">
              <div className="h-2 bg-blue-200 rounded-full w-3/4" />
              <div className="h-16 bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg relative overflow-hidden">
                {/* Map lines */}
                <div className="absolute inset-0">
                  <div className="absolute top-3 left-2 right-4 h-0.5 bg-blue-200" />
                  <div className="absolute top-3 right-4 bottom-4 w-0.5 bg-blue-200" />
                  <div className="absolute bottom-4 left-6 right-4 h-0.5 bg-blue-200" />
                  <div className="absolute top-6 left-2 w-0.5 h-4 bg-gray-200" />
                </div>
                {/* Route dot */}
                <div className="absolute top-2.5 left-1.5 w-2 h-2 bg-blue-500 rounded-full animate-ping-slow" />
                <div className="absolute bottom-3.5 right-3.5 w-2 h-2 bg-green-500 rounded-full" />
              </div>
              <div className="h-6 bg-blue-500 rounded-lg mt-1 flex items-center justify-center">
                <span className="text-white text-[6px] font-bold">{c('RLP_ILLUST_START_DELIVERY', t.illustrationStartDelivery)}</span>
              </div>
            </div>
          </div>
          {/* Home button */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-gray-300" />
        </div>
      </div>

      {/* Delivery notification card */}
      <div
        className="absolute top-8 right-4 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2 z-20 animate-float"
        style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}
      >
        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
          <Bike className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-900">{c('RLP_ILLUST_NEW_DELIVERY', t.illustrationNewDelivery)}</div>
          <div className="text-xs text-blue-600">{c('RLP_ILLUST_NEW_DELIVERY_AMOUNT', t.illustrationNewDeliveryAmount)}</div>
        </div>
      </div>

      {/* Earnings badge */}
      <div
        className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-xl p-3 z-20 animate-float"
        style={{ animationDelay: '1s', animationDuration: '4.5s' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-gray-800">{c('RLP_ILLUST_TODAY', t.illustrationToday)}</span>
        </div>
        <div className="text-base font-extrabold text-blue-600">{c('RLP_ILLUST_TODAY_AMOUNT', t.illustrationTodayAmount)}</div>
        <div className="text-xs text-gray-400">{c('RLP_ILLUST_TODAY_DELIVERIES', t.illustrationTodayDeliveries)}</div>
      </div>

      {/* Rating badge */}
      <div
        className="absolute top-24 left-0 bg-white rounded-2xl shadow-xl px-3 py-2 z-20 animate-float"
        style={{ animationDelay: '0.8s', animationDuration: '5s' }}
      >
        <div className="flex gap-0.5 mb-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <div className="text-xs text-gray-500">{c('RLP_ILLUST_RIDER_RATING', t.illustrationRiderRating)}</div>
      </div>

      {/* Location pin */}
      <div
        className="absolute bottom-14 left-8 bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-20 animate-float"
        style={{ animationDelay: '1.5s', animationDuration: '3s' }}
      >
        <Navigation className="w-4 h-4 text-white" />
      </div>

      {/* Bike emoji */}
      <div
        className="absolute top-4 left-16 z-20 animate-rocket"
        style={{ animationDuration: '3.5s' }}
      >
        <div className="text-3xl">🏍️</div>
      </div>

      {/* Sparkle dots */}
      {[
        { top: '15%', left: '10%', delay: '0s', size: 8 },
        { top: '60%', right: '10%', delay: '0.6s', size: 6 },
        { top: '35%', left: '5%', delay: '1.2s', size: 5 },
        { bottom: '10%', right: '20%', delay: '0.3s', size: 7 },
      ].map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400 animate-ping-slow z-10"
          style={{
            ...dot,
            width: dot.size,
            height: dot.size,
            animationDelay: dot.delay,
            animationDuration: `${2.5 + i * 0.4}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Bike Delivery Illustration ──────────────────────────────────────────────
function BikeDeliveryIllustration() {
  return (
    <div className="relative h-64 flex items-center justify-center">
      <div className="animate-bike">
        <div className="relative">
          {/* Rider + bike */}
          <div className="flex items-end gap-0">
            <div className="w-16 h-12 bg-blue-500 rounded-t-xl rounded-bl-lg relative flex items-center justify-center">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div className="w-12 h-8 bg-blue-600 rounded-t-lg relative flex items-center justify-center">
              <div className="w-6 h-5 bg-amber-400 rounded-sm flex items-center justify-center">
                <span className="text-[6px] font-bold text-amber-900">📦</span>
              </div>
            </div>
          </div>
          {/* Wheels */}
          <div className="flex gap-8 px-2 mt-0.5">
            <div className="w-7 h-7 rounded-full bg-gray-800 border-4 border-gray-300 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-800 border-4 border-gray-300 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            </div>
          </div>
          {/* Speed lines */}
          <div className="absolute -left-10 top-4 space-y-1.5">
            {[20, 14, 18].map((w, i) => (
              <div
                key={i}
                className="h-1.5 bg-blue-200 rounded-full opacity-70"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Road */}
      <div className="absolute bottom-8 left-0 right-0 h-1.5 bg-gray-200 rounded-full" />
      <div className="absolute bottom-8 left-1/4 w-8 h-1.5 bg-white rounded-full" />
      <div className="absolute bottom-8 right-1/4 w-8 h-1.5 bg-white rounded-full" />
    </div>
  );
}

// ─── Delivery Map Illustration ───────────────────────────────────────────────
function DeliveryMapIllustration({ c, t }: { c: (k: string, f: string) => string; t: any }) {
  return (
    <div className="relative h-72 flex items-center justify-center">
      <div className="relative animate-float" style={{ animationDuration: '5s' }}>
        {/* Map card */}
        <div className="w-48 bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">
          {/* Header */}
          <div className="h-8 bg-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-wider">{c('RLP_ILLUST_DELIVERY_MAP', t.illustrationDeliveryMap)}</span>
          </div>
          {/* Map content */}
          <div className="p-3 relative h-32 bg-gradient-to-br from-blue-50 to-sky-50">
            {/* Roads */}
            <div className="absolute top-4 left-3 right-3 h-0.5 bg-gray-300" />
            <div className="absolute top-4 left-6 bottom-6 w-0.5 bg-gray-300" />
            <div className="absolute bottom-6 left-6 right-6 h-0.5 bg-gray-300" />
            <div className="absolute top-8 right-6 bottom-6 w-0.5 bg-gray-300" />
            {/* Route line */}
            <div className="absolute top-3.5 left-5.5 w-0.5 h-8 bg-blue-400 opacity-60" />
            {/* Points */}
            <div className="absolute top-3 left-4 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center animate-ping-slow">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div className="absolute bottom-5 right-5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            {/* ETA */}
            <div className="absolute bottom-1 left-2 bg-white rounded-lg px-2 py-0.5 shadow-sm">
              <span className="text-[8px] font-bold text-blue-600">{c('RLP_ILLUST_ETA', t.illustrationEta)}</span>
            </div>
          </div>
          {/* Bottom bar */}
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600">{c('RLP_ILLUST_DISTANCE', t.illustrationDistance)}</span>
            <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
              <Navigation className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        {/* Floating earnings */}
        <div
          className="absolute -top-6 -right-8 bg-white rounded-xl shadow-lg px-3 py-2 animate-float"
          style={{ animationDelay: '0.7s', animationDuration: '4s' }}
        >
          <div className="text-xs text-gray-500">{c('RLP_ILLUST_WEEKLY_EARNINGS', t.illustrationWeeklyEarnings)}</div>
          <div className="text-sm font-bold text-blue-600">{c('RLP_ILLUST_WEEKLY_AMOUNT', t.illustrationWeeklyAmount)}</div>
        </div>

        <div
          className="absolute -bottom-4 -left-10 bg-white rounded-xl shadow-lg px-3 py-2 animate-float"
          style={{ animationDelay: '1.2s', animationDuration: '3.5s' }}
        >
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{c('RLP_ILLUST_RATING', t.illustrationRating)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Illustrations ──────────────────────────────────────────────────────
const StepIcons = [
  () => (
    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
      <Users className="w-8 h-8 text-white" />
    </div>
  ),
  () => (
    <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
      <CheckCircle className="w-8 h-8 text-white" />
    </div>
  ),
  () => (
    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
      <Bike className="w-8 h-8 text-white" />
    </div>
  ),
];

// ─── Main Landing Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const { lang, setLang, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cms, setCms] = useState<Record<string, string>>({});

  useScrollAnimation();

  // Navbar scroll effect
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Fetch CMS content
  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') setCms(data);
      })
      .catch(() => {});
  }, []);

  const c = (key: string, fallback: string) => cms[key] || fallback;

  const navLinks = [
    { label: c('RLP_NAV_FEATURES', t.navFeatures), href: '#features' },
    { label: c('RLP_NAV_HOW_IT_WORKS', t.navHowItWorks), href: '#how-it-works' },
    { label: c('RLP_NAV_TESTIMONIALS', t.navTestimonials), href: '#testimonials' },
    { label: c('RLP_NAV_CONTACT', t.navContact), href: '#support' },
  ];

  const appName = c('APP_NAME', '');
  const appLogo = c('APP_LOGO', '');

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? 'navbar-scrolled' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {appLogo ? (
                <img src={appLogo} alt={appName} className="h-9 w-auto object-contain" />
              ) : appName ? (
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-extrabold text-sm">{appName.substring(0, 2).toUpperCase()}</span>
                </div>
              ) : null}
              <div>
                <span className="font-extrabold text-gray-900 text-base">{appName}</span>
                <span className="ml-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                  {c('RLP_NAVBAR_BADGE', t.riderBadge)}
                </span>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher lang={lang} setLang={setLang} />
              <Link
                href="/login"
                className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors px-3 py-2"
              >
                {c('RLP_NAV_SIGN_IN', t.navSignIn)}
              </Link>
              <Link
                href="/register"
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
              >
                {c('RLP_NAV_START_RIDING', t.navStartRiding)}
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <LanguageSwitcher lang={lang} setLang={setLang} />
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 py-2"
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1 text-center border border-gray-200 text-sm font-semibold py-2.5 rounded-xl text-gray-700">
                {c('RLP_NAV_SIGN_IN', t.navSignIn)}
              </Link>
              <Link href="/register" className="flex-1 text-center bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl">
                {c('RLP_NAV_START_RIDING', t.navStartRiding)}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="hero-bg pt-28 pb-20 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <div
                className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-6"
                style={{ animation: 'fadeInUp 0.6s ease forwards' }}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {c('RLP_HERO_BADGE', t.heroBadge)}
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6"
                style={{ animation: 'fadeInUp 0.7s 0.1s ease both' }}
              >
                {c('RLP_HERO_TITLE', t.heroTitle)}{' '}
                <span className="gradient-text">{c('RLP_HERO_TITLE_BRAND', t.heroTitleBrand)}</span>
              </h1>

              <p
                className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg"
                style={{ animation: 'fadeInUp 0.7s 0.2s ease both' }}
              >
                {c('RLP_HERO_SUBTITLE', t.heroSubtitle)}
              </p>

              <div
                className="flex flex-wrap gap-4 mb-8"
                style={{ animation: 'fadeInUp 0.7s 0.3s ease both' }}
              >
                <Link
                  href="/register"
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 animate-pulse-blue"
                >
                  {c('RLP_HERO_CTA_PRIMARY', t.heroCtaPrimary)}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 border-2 border-gray-200 hover:border-blue-300 text-gray-700 font-bold px-8 py-4 rounded-2xl text-base transition-all hover:bg-blue-50"
                >
                  {c('RLP_HERO_CTA_SECONDARY', t.heroCtaSecondary)}
                </Link>
              </div>

              <p className="text-sm text-gray-400" style={{ animation: 'fadeInUp 0.7s 0.4s ease both' }}>
                {c('RLP_HERO_LOGIN_NOTE', t.heroLoginNote)}{' '}
                <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                  {c('RLP_NAV_SIGN_IN', t.navSignIn)} →
                </Link>
              </p>
            </div>

            {/* Right: Illustration */}
            <div style={{ animation: 'fadeInRight 0.8s 0.2s ease both' }}>
              <HeroIllustration c={c} t={t} />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-12">
          <a href="#stats" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
            <span className="text-xs font-medium">{c('RLP_SCROLL_TO_EXPLORE', t.scrollToExplore)}</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </a>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────────────────────── */}
      <section id="stats" className="py-12 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: c('RLP_STATS_RIDERS', t.statsRiders), label: c('RLP_STATS_RIDERS_LABEL', t.statsRidersLabel), icon: Users },
              { value: c('RLP_STATS_DELIVERIES', t.statsDeliveries), label: c('RLP_STATS_DELIVERIES_LABEL', t.statsDeliveriesLabel), icon: Truck },
              { value: c('RLP_STATS_AVG_EARNINGS', t.statsAvgEarnings), label: c('RLP_STATS_AVG_EARNINGS_LABEL', t.statsAvgEarningsLabel), icon: DollarSign },
              { value: c('RLP_STATS_CITIES', t.statsCities), label: c('RLP_STATS_CITIES_LABEL', t.statsCitiesLabel), icon: MapPin },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="scroll-animate text-center"
                  style={{ transitionDelay: `${i * 0.1}s` }}
                >
                  <Icon className="w-6 h-6 text-blue-200 mx-auto mb-2" />
                  <div className="text-3xl font-extrabold text-white">{stat.value}</div>
                  <div className="text-sm text-blue-200 mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why Ride With Us ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="scroll-animate">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <Zap className="w-4 h-4" />
                {c('RLP_BENEFITS_BADGE', t.riderBenefitsBadge)}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                {c('RLP_WHY_TITLE', t.whyRideTitle)}
              </h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                {c('RLP_WHY_SUBTITLE', t.whyRideSubtitle)}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {[
              {
                icon: Clock,
                bg: 'bg-blue-50',
                iconColor: 'text-blue-600',
                title: c('RLP_FEATURE_1_TITLE', t.feature1Title),
                desc: c('RLP_FEATURE_1_DESC', t.feature1Desc),
                delay: '0s',
              },
              {
                icon: DollarSign,
                bg: 'bg-green-50',
                iconColor: 'text-green-600',
                title: c('RLP_FEATURE_2_TITLE', t.feature2Title),
                desc: c('RLP_FEATURE_2_DESC', t.feature2Desc),
                delay: '0.15s',
              },
              {
                icon: Navigation,
                bg: 'bg-purple-50',
                iconColor: 'text-purple-600',
                title: c('RLP_FEATURE_3_TITLE', t.feature3Title),
                desc: c('RLP_FEATURE_3_DESC', t.feature3Desc),
                delay: '0.3s',
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="scroll-animate feature-card bg-white border border-gray-100 rounded-3xl p-8 shadow-sm"
                  style={{ transitionDelay: card.delay }}
                >
                  <div className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center mb-5`}>
                    <Icon className={`w-7 h-7 ${card.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{card.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
                  <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-blue-600">
                    {c('RLP_LEARN_MORE', t.learnMore)} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bike delivery animation */}
          <div className="mt-12 scroll-animate">
            <BikeDeliveryIllustration />
          </div>
        </div>
      </section>

      {/* ── Why Deliver in Korea ────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <div className="scroll-animate from-left">
                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                  <MapPin className="w-4 h-4" />
                  {c('RLP_MARKET_BADGE', t.marketOpportunityBadge)}
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                  {c('RLP_MARKET_TITLE', t.whyDeliverTitle)}
                </h2>
                <p className="text-gray-500 text-base mb-8">
                  {c('RLP_MARKET_SUBTITLE', t.whyDeliverSubtitle)}
                </p>
              </div>

              <div className="space-y-5">
                {[
                  {
                    icon: '📦',
                    color: 'bg-blue-100',
                    title: c('RLP_MARKET_1_TITLE', t.market1Title),
                    desc: c('RLP_MARKET_1_DESC', t.market1Desc),
                    delay: '0.1s',
                  },
                  {
                    icon: '🏙️',
                    color: 'bg-green-100',
                    title: c('RLP_MARKET_2_TITLE', t.market2Title),
                    desc: c('RLP_MARKET_2_DESC', t.market2Desc),
                    delay: '0.2s',
                  },
                  {
                    icon: '📈',
                    color: 'bg-purple-100',
                    title: c('RLP_MARKET_3_TITLE', t.market3Title),
                    desc: c('RLP_MARKET_3_DESC', t.market3Desc),
                    delay: '0.3s',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="scroll-animate from-left flex gap-4 items-start bg-white rounded-2xl p-5 shadow-sm border border-gray-100 feature-card"
                    style={{ transitionDelay: item.delay }}
                  >
                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: illustration */}
            <div className="scroll-animate from-right">
              <DeliveryMapIllustration c={c} t={t} />

              {/* Mini stats */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { label: c('RLP_MINI_STAT_1_LABEL', t.miniStatOnlineShoppingLabel), value: c('RLP_MINI_STAT_1_VALUE', t.miniStatOnlineShoppingValue), color: 'text-blue-600' },
                  { label: c('RLP_MINI_STAT_2_LABEL', t.miniStatDailyDeliveriesLabel), value: c('RLP_MINI_STAT_2_VALUE', t.miniStatDailyDeliveriesValue), color: 'text-green-600' },
                  { label: c('RLP_MINI_STAT_3_LABEL', t.miniStatMarketGrowthLabel), value: c('RLP_MINI_STAT_3_VALUE', t.miniStatMarketGrowthValue), color: 'text-purple-600' },
                  { label: c('RLP_MINI_STAT_4_LABEL', t.miniStatAvgTimeLabel), value: c('RLP_MINI_STAT_4_VALUE', t.miniStatAvgTimeValue), color: 'text-amber-600' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <div className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 scroll-animate">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <Star className="w-4 h-4 fill-amber-400" />
              {c('RLP_STORIES_BADGE', t.riderStoriesBadge)}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              {c('RLP_TESTIMONIALS_TITLE', t.testimonialsTitle)}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: c('RLP_TESTIMONIAL_1_QUOTE', t.testimonial1Quote),
                name: c('RLP_TESTIMONIAL_1_NAME', t.testimonial1Name),
                company: c('RLP_TESTIMONIAL_1_COMPANY', t.testimonial1Company),
                color: 'text-blue-500',
                bg: 'from-blue-50 to-white',
                delay: '0s',
              },
              {
                quote: c('RLP_TESTIMONIAL_2_QUOTE', t.testimonial2Quote),
                name: c('RLP_TESTIMONIAL_2_NAME', t.testimonial2Name),
                company: c('RLP_TESTIMONIAL_2_COMPANY', t.testimonial2Company),
                color: 'text-sky-500',
                bg: 'from-sky-50 to-white',
                delay: '0.15s',
              },
              {
                quote: c('RLP_TESTIMONIAL_3_QUOTE', t.testimonial3Quote),
                name: c('RLP_TESTIMONIAL_3_NAME', t.testimonial3Name),
                company: c('RLP_TESTIMONIAL_3_COMPANY', t.testimonial3Company),
                color: 'text-cyan-500',
                bg: 'from-cyan-50 to-white',
                delay: '0.3s',
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`scroll-animate feature-card bg-gradient-to-b ${item.bg} border border-gray-100 rounded-3xl p-8 shadow-sm`}
                style={{ transitionDelay: item.delay }}
              >
                <div className={`text-5xl font-serif ${item.color} leading-none mb-4 opacity-40`}>&ldquo;</div>
                <p className="text-gray-700 text-base leading-relaxed mb-6 italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.color.replace('text-', 'from-')} to-gray-200 flex items-center justify-center text-white font-bold`}>
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.company}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to Get Started ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 scroll-animate">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <CheckCircle className="w-4 h-4" />
              {c('RLP_GET_STARTED_BADGE', t.getStartedBadge)}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              {c('RLP_STEPS_TITLE', t.howToStartTitle)}
            </h2>
            <p className="text-gray-500 text-lg">{c('RLP_STEPS_SUBTITLE', t.howToStartSubtitle)}</p>
          </div>

          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-200 via-sky-200 to-amber-200 z-0" />

            <div className="grid lg:grid-cols-3 gap-10 relative z-10">
              {[
                {
                  num: '1',
                  numBg: 'bg-blue-500',
                  title: c('RLP_STEP_1_TITLE', t.step1Title),
                  desc: c('RLP_STEP_1_DESC', t.step1Desc),
                  Icon: StepIcons[0],
                  delay: '0s',
                },
                {
                  num: '2',
                  numBg: 'bg-sky-500',
                  title: c('RLP_STEP_2_TITLE', t.step2Title),
                  desc: c('RLP_STEP_2_DESC', t.step2Desc),
                  Icon: StepIcons[1],
                  delay: '0.2s',
                },
                {
                  num: '3',
                  numBg: 'bg-amber-500',
                  title: c('RLP_STEP_3_TITLE', t.step3Title),
                  desc: c('RLP_STEP_3_DESC', t.step3Desc),
                  Icon: StepIcons[2],
                  delay: '0.4s',
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="scroll-animate text-center"
                  style={{ transitionDelay: step.delay }}
                >
                  <div className="relative mb-6">
                    <div
                      className={`w-12 h-12 ${step.numBg} rounded-full flex items-center justify-center mx-auto text-white font-extrabold text-lg shadow-lg relative z-10`}
                    >
                      {step.num}
                    </div>
                  </div>
                  <div className="mb-5">
                    <step.Icon />
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-14 scroll-animate">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-10 py-4 rounded-2xl text-base transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              {c('RLP_HERO_CTA_PRIMARY', t.heroCtaPrimary)}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-blue-300 text-gray-700 font-bold px-10 py-4 rounded-2xl text-base transition-all hover:bg-blue-50"
            >
              {c('RLP_ALREADY_ACCOUNT', t.alreadyHaveAccountSignIn)}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Support Banner ─────────────────────────────────────────────────── */}
      <section id="support" className="py-20 px-4 bg-gradient-to-br from-blue-600 via-blue-700 to-sky-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="max-w-3xl mx-auto text-center relative z-10 scroll-animate">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            {c('RLP_SUPPORT_TITLE', t.supportTitle)}
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            {c('RLP_SUPPORT_DESC', t.supportDesc)}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`mailto:${c('SUPPORT_EMAIL', 'support@example.com')}`}
              className="bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors"
            >
              {c('RLP_SUPPORT_CTA', t.supportCta)}
            </a>
            <Link
              href="/register"
              className="border-2 border-white/40 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              {c('RLP_NAV_START_RIDING', t.navStartRiding)}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {appLogo ? (
                  <img src={appLogo} alt={appName} className="h-9 w-auto object-contain" />
                ) : appName ? (
                  <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-extrabold text-sm">{appName.substring(0, 2).toUpperCase()}</span>
                  </div>
                ) : null}
                <span className="text-white font-extrabold text-lg">{appName}</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">{c('RLP_FOOTER_TAGLINE', t.footerTagline)}</p>
              <div className="flex gap-3 mt-5">
                {['📘', '🐦', '📷', '▶'].map((icon, i) => (
                  <div key={i} className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 cursor-pointer transition-colors text-base">
                    {icon}
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">{c('RLP_FOOTER_LINKS', t.footerLinks)}</h4>
              <ul className="space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="hover:text-blue-400 transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href="/register" className="hover:text-blue-400 transition-colors">
                    {c('RLP_NAV_START_RIDING', t.navStartRiding)}
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-blue-400 transition-colors">
                    {c('RLP_NAV_SIGN_IN', t.navSignIn)}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">{c('RLP_FOOTER_CONTACT', t.footerContact)}</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span>✉</span>
                  <span>{c('SUPPORT_EMAIL', 'support@example.com')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📞</span>
                  <span>{c('SUPPORT_PHONE', '+82-2-0000-0000')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>{c('BUSINESS_HOURS', t.businessHours)}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs">{c('RLP_FOOTER_COPYRIGHT', t.footerCopyright)}</p>
            <div className="flex gap-4 text-xs">
              <a href="#" className="hover:text-blue-400 transition-colors">
                {c('RLP_PRIVACY_POLICY', t.privacyPolicy)}
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                {c('RLP_TERMS_OF_SERVICE', t.termsOfService)}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
