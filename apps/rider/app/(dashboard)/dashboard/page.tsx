'use client';

import { useState, useEffect } from 'react';
import { Bike, Navigation, DollarSign, TrendingUp, Clock, CheckCircle, Package } from 'lucide-react';
import { useLanguage } from '../../../lib/useLanguage';
import api from '../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ASSIGNED: 'bg-blue-100 text-blue-700',
    PICKED_UP: 'bg-purple-100 text-purple-700',
    IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
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
  const [cms, setCms] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const c = (key: string, fallback: string) => cms[key] || fallback;

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => { if (data && typeof data === 'object') setCms(data); })
      .catch(() => {});

    Promise.allSettled([
      api.get('/riders/profile'),
      api.get('/delivery/rider/assignments'),
      api.get('/delivery/rider/earnings'),
    ]).then(([profileRes, assignRes, earnRes]) => {
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
        setIsOnline(profileRes.value.data?.isOnline || false);
      }
      if (assignRes.status === 'fulfilled') {
        const data = assignRes.value.data;
        setAssignments(Array.isArray(data) ? data : data?.assignments || data?.data || []);
      }
      if (earnRes.status === 'fulfilled') {
        setEarnings(earnRes.value.data);
      }
      setLoading(false);
    });
  }, []);

  const toggleOnline = async () => {
    setTogglingOnline(true);
    try {
      await api.put('/riders/online-status', { isOnline: !isOnline });
      setIsOnline(!isOnline);
    } catch {}
    setTogglingOnline(false);
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const totalDeliveries = assignments?.length || 0;
  const activeDeliveries = assignments?.filter((a: any) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(a.status)).length || 0;
  const completedDeliveries = assignments?.filter((a: any) => a.status === 'DELIVERED').length || 0;

  const stats = [
    {
      title: c('RDP_TOTAL_DELIVERIES', t.totalDeliveries),
      value: totalDeliveries.toLocaleString(),
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: c('RDP_ACTIVE_DELIVERIES', t.activeDeliveries),
      value: activeDeliveries.toLocaleString(),
      icon: Bike,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: c('RDP_TOTAL_EARNINGS', t.totalEarnings),
      value: `₩${(earnings?.totalEarnings ?? earnings?.total ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: c('RDP_COMPLETION_RATE', t.completionRate),
      value: totalDeliveries > 0 ? `${Math.round((completedDeliveries / totalDeliveries) * 100)}%` : '0%',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  const recentDeliveries = assignments?.slice(0, 5) || [];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{c('RDP_DASHBOARD', t.dashboard)}</h1>
          <p className="text-gray-500 mt-1">{c('RDP_DASHBOARD_SUBTITLE', t.dashboardSubtitle)}</p>
        </div>

        {/* Online/Offline toggle */}
        <button
          onClick={toggleOnline}
          disabled={togglingOnline}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            isOnline
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isOnline ? c('RDP_GO_OFFLINE', t.goOffline) : c('RDP_GO_ONLINE', t.goOnline)}
        </button>
      </div>

      {/* Online status banner */}
      <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
        isOnline ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'
      }`}>
        {isOnline ? c('RDP_YOU_ARE_ONLINE', t.youAreOnline) : c('RDP_YOU_ARE_OFFLINE', t.youAreOffline)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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

      {/* Recent Deliveries */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{c('RDP_RECENT_DELIVERIES', t.recentDeliveries)}</h3>
          <a href="/deliveries" className="text-sm text-secondary font-medium hover:underline">
            {c('RDP_VIEW_ALL', t.viewAll)}
          </a>
        </div>

        {recentDeliveries.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <Bike className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{c('RDP_NO_DELIVERIES', t.noDeliveries)}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    c('RDP_ORDER_NUMBER', t.orderNumber),
                    c('RDP_PICKUP', t.pickup),
                    c('RDP_DROPOFF', t.dropoff),
                    c('RDP_DELIVERY_STATUS', t.deliveryStatus),
                    c('RDP_AMOUNT', t.amount),
                    c('RDP_DATE', t.date),
                  ].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentDeliveries.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900 text-sm">
                      #{d.orderNumber || d.order?.orderNumber || d.id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm truncate max-w-[150px]">
                      {d.pickupAddress || d.order?.seller?.storeName || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm truncate max-w-[150px]">
                      {d.dropoffAddress || d.order?.deliveryAddress || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-6 py-4 font-semibold text-sm">
                      ₩{(d.deliveryFee ?? d.fee ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
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
