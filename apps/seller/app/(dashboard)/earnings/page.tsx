'use client';

import { useQuery } from '@tanstack/react-query';
import { sellerApi } from '../../../lib/api';
import { DollarSign, TrendingUp, Clock, Percent } from 'lucide-react';
import { useLanguage } from '../../../lib/useLanguage';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bg: string;
}) {
  return (
    <div className="stat-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
    </div>
  );
}

export default function EarningsPage() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-earnings'],
    queryFn: () => sellerApi.getEarnings().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-gray-100 mb-4" />
              <div className="h-7 w-24 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const earnings = data || {};

  const stats = [
    {
      title: t.totalEarned,
      value: `₩${(earnings?.totalEarned ?? earnings?.total ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: t.thisMonth,
      value: `₩${(earnings?.thisMonth ?? earnings?.monthEarned ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: t.pendingPayout,
      value: `₩${(earnings?.pendingPayout ?? earnings?.pending ?? 0).toLocaleString()}`,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: t.commissionRate,
      value: `${earnings?.commissionRate ?? earnings?.commission ?? 0}%`,
      icon: Percent,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  const payouts: any[] = earnings?.payouts || earnings?.recentPayouts || [];

  const monthlyData: { month: string; amount: number }[] =
    earnings?.monthly ||
    earnings?.monthlyRevenue ||
    [
      { month: 'Jan', amount: 0 },
      { month: 'Feb', amount: 0 },
      { month: 'Mar', amount: 0 },
      { month: 'Apr', amount: 0 },
      { month: 'May', amount: 0 },
      { month: 'Jun', amount: 0 },
    ];

  const maxAmount = Math.max(...monthlyData.map((d) => d.amount), 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.earnings}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Bar Chart (pure CSS) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-6">{t.thisMonth}</h3>
          <div className="flex items-end gap-3 h-40">
            {monthlyData.map((item) => {
              const heightPct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">
                    {item.amount > 0 ? `₩${(item.amount / 1000).toFixed(0)}k` : ''}
                  </span>
                  <div className="w-full bg-gray-100 rounded-t-lg flex items-end" style={{ height: '100px' }}>
                    <div
                      className="w-full bg-primary rounded-t-lg transition-all duration-500"
                      style={{ height: `${Math.max(heightPct, item.amount > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{item.month}</span>
                </div>
              );
            })}
          </div>
          {monthlyData.every((d) => d.amount === 0) && (
            <p className="text-center text-sm text-gray-400 mt-2">{t.noPayouts}</p>
          )}
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-5">{t.payoutHistory}</h3>
          {payouts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t.noPayouts}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout: any, idx: number) => (
                <div
                  key={payout.id || idx}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      ₩{(payout.amount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {payout.createdAt || payout.date
                        ? new Date(payout.createdAt || payout.date).toLocaleDateString()
                        : '—'}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      payout.status === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {payout.status === 'PAID' ? t.paid : payout.status === 'FAILED' ? t.failed : t.pending}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
