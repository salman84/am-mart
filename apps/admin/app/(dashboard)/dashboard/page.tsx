'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../lib/api';
import { Users, ShoppingBag, DollarSign, Smartphone, Package, MessageSquare, Store, Truck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => adminApi.getDashboard().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Customers',
      value: data?.users?.total?.toLocaleString() || '0',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      change: '+12%',
    },
    {
      title: 'Total Orders (Today)',
      value: data?.orders?.today?.toLocaleString() || '0',
      icon: ShoppingBag,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      change: data?.orders?.total ? `${data.orders.total} total` : '',
    },
    {
      title: "Today's Revenue",
      value: `₩${(data?.revenue?.today || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      change: `₩${(data?.revenue?.thisMonth || 0).toLocaleString()} this month`,
    },
    {
      title: 'Active Products',
      value: data?.products?.active?.toLocaleString() || '0',
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Approved Sellers',
      value: data?.sellers?.approved?.toLocaleString() || '0',
      icon: Store,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      change: data?.sellers?.pending ? `${data.sellers.pending} pending` : '',
    },
    {
      title: 'Available SIM Numbers',
      value: data?.sim?.available?.toLocaleString() || '0',
      icon: Smartphone,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      change: data?.sim?.pending ? `${data.sim.pending} orders pending` : '',
    },
    {
      title: 'Riders',
      value: data?.riders?.total?.toLocaleString() || '0',
      icon: Truck,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'Open Tickets',
      value: data?.support?.open?.toLocaleString() || '0',
      icon: MessageSquare,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  // Demo chart data
  const revenueData = [
    { day: 'Mon', revenue: 245000 }, { day: 'Tue', revenue: 312000 },
    { day: 'Wed', revenue: 198000 }, { day: 'Thu', revenue: 425000 },
    { day: 'Fri', revenue: 389000 }, { day: 'Sat', revenue: 512000 },
    { day: 'Sun', revenue: 298000 },
  ];

  const orderData = [
    { hour: '6am', orders: 12 }, { hour: '8am', orders: 25 },
    { hour: '10am', orders: 48 }, { hour: '12pm', orders: 72 },
    { hour: '2pm', orders: 55 }, { hour: '4pm', orders: 38 },
    { hour: '6pm', orders: 63 }, { hour: '8pm', orders: 45 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with AM Mart.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {stat.change && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">{stat.change}</span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Weekly Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₩${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => `₩${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Today's Orders by Hour</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Add SIM Numbers', href: '/sim-numbers', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', icon: '📱' },
            { label: 'Review Sellers', href: '/sellers?status=PENDING', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100', icon: '🏪' },
            { label: 'Manage Orders', href: '/orders', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', icon: '📦' },
            { label: 'Support Tickets', href: '/support', color: 'bg-red-50 text-red-700 hover:bg-red-100', icon: '💬' },
          ].map((action, i) => (
            <a
              key={i}
              href={action.href}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors cursor-pointer ${action.color}`}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-semibold text-center">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
