'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Package,
  Plus,
  ShoppingBag,
  DollarSign,
  Store,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';
import { LanguageSwitcher } from './LanguageSwitcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function Sidebar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [appName, setAppName] = useState('');
  const [appLogo, setAppLogo] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.APP_NAME) setAppName(data.APP_NAME);
        if (data?.APP_LOGO) setAppLogo(data.APP_LOGO);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t.dashboard },
    { href: '/products', icon: Package, label: t.myProducts },
    { href: '/products/add', icon: Plus, label: t.addProduct },
    { href: '/orders', icon: ShoppingBag, label: t.orders },
    { href: '/earnings', icon: DollarSign, label: t.earnings },
    { href: '/profile', icon: Store, label: t.storeProfile },
  ];

  const logout = () => {
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerUser');
    window.location.href = '/login';
  };

  let storeName = '';
  try {
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('sellerUser') || '{}');
      storeName = user?.storeName || user?.seller?.storeName || user?.fullName || '';
    }
  } catch {}

  return (
    <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        {appLogo ? (
          <img src={appLogo} alt={appName} className="h-9 w-9 rounded-xl object-contain flex-shrink-0" />
        ) : appName ? (
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{appName.substring(0, 2).toUpperCase()}</span>
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{appName}</div>
          <div className="text-xs text-gray-500">{t.sellerPortal}</div>
        </div>
      </div>

      {/* Store name */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-800 truncate">{storeName}</span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/products/add' &&
              item.href !== '/products' &&
              pathname?.startsWith(`${item.href}/`)) ||
            (item.href === '/products' && pathname === '/products');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'sidebar-item',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer: Language switcher + Logout */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-3">
        <div className="px-2">
          <LanguageSwitcher lang={lang} setLang={setLang} />
        </div>
        <button
          onClick={logout}
          className="sidebar-item text-red-500 hover:bg-red-50 hover:text-red-600 w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>{t.logout}</span>
        </button>
      </div>
    </div>
  );
}
