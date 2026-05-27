'use client';

import { useQuery } from '@tanstack/react-query';
import { sellerApi } from '../../../lib/api';
import { Package, ShoppingBag, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { useLanguage } from '../../../lib/useLanguage';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    PREPARING: 'bg-purple-100 text-purple-700',
    OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="stat-card animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-100" />
      </div>
      <div className="h-7 w-24 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-32 bg-gray-100 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => sellerApi.getDashboard().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-5 w-32 bg-gray-100 rounded mb-6" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dashboard = data || {};

  const stats = [
    {
      title: t.totalProducts,
      value: (dashboard?.products?.active ?? dashboard?.totalProducts ?? 0).toLocaleString(),
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: t.pendingOrders,
      value: (dashboard?.orders?.pending ?? dashboard?.pendingOrders ?? 0).toLocaleString(),
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: t.totalRevenue,
      value: `₩${(dashboard?.revenue?.total ?? dashboard?.totalRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: t.thisMonth,
      value: `₩${(dashboard?.revenue?.thisMonth ?? dashboard?.monthRevenue ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  const recentOrders: any[] =
    dashboard?.recentOrders ?? dashboard?.orders?.recent ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.dashboard}</h1>
        <p className="text-gray-500 mt-1">{t.welcomeBack}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="stat-card hover:shadow-md transition-shadow">
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

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{t.recentOrders}</h3>
          <a href="/orders" className="text-sm text-primary font-medium hover:underline">
            {t.viewAll}
          </a>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{t.noOrders}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[t.orderNumber, t.items, t.total, t.orderStatus, t.date].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.slice(0, 5).map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono font-semibold text-gray-900">
                      #{order.orderNumber || order.id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="table-td text-gray-500">
                      {order.items?.length ?? order.itemCount ?? 1}
                    </td>
                    <td className="table-td font-semibold">
                      ₩{(order.total ?? order.totalAmount ?? 0).toLocaleString()}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="table-td text-gray-500">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
