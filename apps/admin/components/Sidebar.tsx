'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, ShoppingBag, Package, Truck, Zap,
  CreditCard, TicketPercent, Image, MessageSquare, Settings,
  LogOut, Store, ChevronDown, ChevronRight, Smartphone, BarChart3, Tag,
  Database, Plug, Star, MapPin, TrendingUp, SlidersHorizontal, KeyRound, Palette, Globe,
  Warehouse, Box, ArrowLeftRight, ScanLine, Route, Clock, DollarSign, CalendarDays,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Users',
    items: [
      { href: '/users', icon: Users, label: 'Users & Roles' },
      { href: '/customers', icon: Users, label: 'Customers' },
      { href: '/sellers', icon: Store, label: 'Sellers' },
      { href: '/riders', icon: Truck, label: 'Riders' },
    ],
  },
  {
    label: 'Products & Orders',
    items: [
      { href: '/products', icon: ShoppingBag, label: 'Products' },
      { href: '/categories', icon: Tag, label: 'Categories' },
      { href: '/orders', icon: Package, label: 'Orders' },
      { href: '/reviews', icon: Star, label: 'Reviews' },
    ],
  },
  {
    label: 'Warehouse & Delivery',
    items: [
      { href: '/fulfillment-centers', icon: Warehouse, label: 'Fulfillment Centers' },
      { href: '/warehouse-bins', icon: Box, label: 'Warehouse Bins' },
      { href: '/warehouse-inventory', icon: Package, label: 'Warehouse Inventory' },
      { href: '/warehouse-transfers', icon: ArrowLeftRight, label: 'Transfers' },
      { href: '/packages', icon: ScanLine, label: 'Packages & Tracking' },
      { href: '/delivery-routes', icon: Route, label: 'Delivery Routes' },
      { href: '/driver-shifts', icon: CalendarDays, label: 'Driver Shifts' },
      { href: '/time-slots', icon: Clock, label: 'Time Slots' },
      { href: '/fee-rules', icon: DollarSign, label: 'Fee Rules' },
    ],
  },
  {
    label: 'Services',
    items: [
      { href: '/sim-numbers', icon: Smartphone, label: 'SIM Numbers & Orders' },
      { href: '/topup-orders', icon: Zap, label: 'Top-Up Orders' },
      { href: '/exchange-rates', icon: TrendingUp, label: 'Exchange Rates' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/payments', icon: CreditCard, label: 'Payments & Refunds' },
      { href: '/integrations', icon: Plug, label: 'API Integrations' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/landing-page', icon: Globe, label: 'Landing Page' },
      { href: '/banners', icon: Image, label: 'Main Slider' },
      { href: '/icons', icon: Palette, label: 'Icons' },
      { href: '/coupons', icon: TicketPercent, label: 'Coupons' },
    ],
  },
  {
    label: 'Support & Settings',
    items: [
      { href: '/support', icon: MessageSquare, label: 'Support Tickets' },
      { href: '/password-reset-requests', icon: KeyRound, label: 'Password Resets' },
      { href: '/delivery-zones', icon: MapPin, label: 'Delivery Zones' },
      { href: '/settings', icon: Settings, label: 'App Settings' },
      { href: '/marketplace-config', icon: SlidersHorizontal, label: 'Marketplace SaaS' },
      { href: '/backup', icon: Database, label: 'Backup & Restore' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Fetch settings — shares the same React Query cache as the Settings page,
  // so the sidebar updates immediately when admin saves a new logo or name
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settingsData?.settings || []).forEach((s: any) => { map[s.key] = s.value ?? ''; });
    return map;
  }, [settingsData]);

  const appName = settingsMap['APP_NAME'] || 'Admin';
  const appLogo = settingsMap['APP_LOGO'] || '';
  const initials = appName.slice(0, 2).toUpperCase();

  const toggleGroup = (label: string) => {
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo — dynamic: pulls APP_LOGO and APP_NAME from settings */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        {appLogo ? (
          <img src={appLogo} alt={appName} className="w-9 h-9 object-contain rounded-xl" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{appName}</div>
          <div className="text-xs text-gray-500">Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex items-center justify-between w-full px-2 py-1 mb-1"
            >
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </span>
              {collapsed[group.label] ? (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              )}
            </button>
            {!collapsed[group.label] && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'sidebar-item',
                        isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button onClick={logout} className="sidebar-item text-red-500 hover:bg-red-50 w-full">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
