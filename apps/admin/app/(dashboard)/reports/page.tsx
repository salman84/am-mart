'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../../lib/api';
import { BarChart2, TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily', label: '7 Days' },
  { value: 'weekly', label: '30 Days' },
  { value: 'monthly', label: '90 Days' },
];

interface RevenueDay {
  date: string;
  revenue: number;
}

interface TopProduct {
  name: string;
  orders: number;
  revenue: number;
}

interface TopSeller {
  name: string;
  orders: number;
  revenue: number;
}

interface ReportsData {
  totalRevenue?: number;
  totalOrders?: number;
  newUsers?: number;
  avgOrderValue?: number;
  revenueByDay?: RevenueDay[];
  topProducts?: TopProduct[];
  topSellers?: TopSeller[];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('daily');

  const { data, isLoading, isError } = useQuery<ReportsData>({
    queryKey: ['reports', period],
    queryFn: () => reportsApi.get(period).then((r) => r.data),
  });

  const stats = [
    {
      label: 'Total Revenue',
      value: data?.totalRevenue != null ? `₩${data.totalRevenue.toLocaleString()}` : '—',
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Orders',
      value: data?.totalOrders != null ? data.totalOrders.toLocaleString() : '—',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'New Users',
      value: data?.newUsers != null ? data.newUsers.toLocaleString() : '—',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Avg Order Value',
      value: data?.avgOrderValue != null ? `₩${data.avgOrderValue.toLocaleString()}` : '—',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Sales and performance analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                period === p.value
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600">
          <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="font-semibold">Failed to load reports</p>
          <p className="text-sm mt-1">Check that the backend is running and try again.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <span className="text-sm text-gray-500 font-medium">{s.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                </div>
              );
            })}
          </div>

          {/* Revenue Line Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Revenue Over Time</h2>
            {data?.revenueByDay && data.revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.revenueByDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₩${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₩${v.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                No revenue data available for this period.
              </div>
            )}
          </div>

          {/* Top Products & Top Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Top 5 Products</h2>
              {data?.topProducts && data.topProducts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-semibold">Product</th>
                      <th className="text-right py-2 text-gray-500 font-semibold">Orders</th>
                      <th className="text-right py-2 text-gray-500 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.slice(0, 5).map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-800">{p.name}</td>
                        <td className="py-2.5 text-right text-gray-600">{p.orders.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">₩{p.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">No product data available.</p>
              )}
            </div>

            {/* Top Sellers */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Top 5 Sellers</h2>
              {data?.topSellers && data.topSellers.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-semibold">Seller</th>
                      <th className="text-right py-2 text-gray-500 font-semibold">Orders</th>
                      <th className="text-right py-2 text-gray-500 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSellers.slice(0, 5).map((s, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-800">{s.name}</td>
                        <td className="py-2.5 text-right text-gray-600">{s.orders.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">₩{s.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">No seller data available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
