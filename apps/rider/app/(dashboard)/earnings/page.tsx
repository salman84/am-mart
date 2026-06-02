'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../../lib/useLanguage';
import api from '../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function EarningsPage() {
  const { t } = useLanguage();
  const [cms, setCms] = useState<Record<string, string>>({});
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const c = (key: string, fallback: string) => cms[key] || fallback;

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => { if (data && typeof data === 'object') setCms(data); })
      .catch(() => {});

    api.get('/delivery/rider/earnings')
      .then((res) => setEarnings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-10 w-10 bg-gray-100 rounded-xl mb-4" />
              <div className="h-7 w-24 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalEarnings = earnings?.totalEarnings ?? earnings?.total ?? 0;
  const pendingPayout = earnings?.pendingPayout ?? earnings?.pending ?? 0;
  const completedPayouts = earnings?.completedPayouts ?? earnings?.completed ?? 0;
  const history = earnings?.history ?? earnings?.deliveries ?? [];

  const stats = [
    {
      title: c('RDP_TOTAL_BALANCE', t.totalBalance),
      value: `₩${totalEarnings.toLocaleString()}`,
      icon: Wallet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: c('RDP_PENDING_PAYOUT', t.pendingPayout),
      value: `₩${pendingPayout.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: c('RDP_COMPLETED_PAYOUTS', t.completedPayouts),
      value: `₩${completedPayouts.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{c('RDP_EARNINGS_OVERVIEW', t.earningsOverview)}</h1>
        <p className="text-gray-500 mt-1">{c('RDP_EARNINGS_SUBTITLE', t.earningsSubtitle)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Earnings History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{c('RDP_EARNINGS_HISTORY', t.earningsHistory)}</h3>
        </div>

        {Array.isArray(history) && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    c('RDP_DELIVERY_ID', t.deliveryId),
                    c('RDP_DATE', t.date),
                    c('RDP_DELIVERY_FEE', t.deliveryFee),
                    c('RDP_TIP', t.tip),
                    c('RDP_BONUS', t.bonus),
                    c('RDP_EARNED_AMOUNT', t.earnedAmount),
                  ].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900">
                      #{item.orderNumber || item.id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">₩{(item.deliveryFee ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">₩{(item.tip ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">₩{(item.bonus ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                      ₩{(item.totalEarned ?? item.deliveryFee ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-14 text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{c('RDP_NO_EARNINGS_YET', t.noEarningsYet)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
