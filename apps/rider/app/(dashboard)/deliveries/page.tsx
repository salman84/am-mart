'use client';

import { useState, useEffect } from 'react';
import { Bike, MapPin, Phone, User, Clock } from 'lucide-react';
import { useLanguage } from '../../../lib/useLanguage';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

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

export default function DeliveriesPage() {
  const { t } = useLanguage();
  const [cms, setCms] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const c = (key: string, fallback: string) => cms[key] || fallback;

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => { if (data && typeof data === 'object') setCms(data); })
      .catch(() => {});

    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const res = await api.get('/delivery/rider/assignments');
      const data = res.data;
      setAssignments(Array.isArray(data) ? data : data?.assignments || data?.data || []);
    } catch {}
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.post(`/delivery/assignments/${id}/status`, { status });
      toast.success(t.success);
      loadAssignments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t.error);
    }
    setUpdatingId(null);
  };

  const filtered = assignments.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(a.status);
    if (filter === 'completed') return a.status === 'DELIVERED';
    if (filter === 'cancelled') return a.status === 'CANCELLED';
    return true;
  });

  const filters = [
    { key: 'all', label: c('RDP_FILTER_ALL', t.filterAll) },
    { key: 'active', label: c('RDP_FILTER_ACTIVE', t.filterActive) },
    { key: 'completed', label: c('RDP_FILTER_COMPLETED', t.filterCompleted) },
    { key: 'cancelled', label: c('RDP_FILTER_CANCELLED', t.filterCancelled) },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{c('RDP_ALL_DELIVERIES', t.allDeliveries)}</h1>
        <p className="text-gray-500 mt-1">{c('RDP_DELIVERIES_SUBTITLE', t.deliveriesSubtitle)}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === f.key
                ? 'bg-secondary text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 w-40 bg-gray-100 rounded mb-4" />
              <div className="h-4 w-64 bg-gray-50 rounded mb-2" />
              <div className="h-4 w-48 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
          <Bike className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{c('RDP_NO_DELIVERIES_FOUND', t.noDeliveriesFound)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((d: any) => (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-gray-900">
                      #{d.orderNumber || d.order?.orderNumber || d.id?.slice(-6).toUpperCase()}
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    ₩{(d.deliveryFee ?? d.fee ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">{c('RDP_DELIVERY_FEE', t.deliveryFee)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">{c('RDP_PICKUP', t.pickup)}</div>
                    <div className="text-sm text-gray-800">{d.pickupAddress || d.order?.seller?.storeName || '—'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">{c('RDP_DROPOFF', t.dropoff)}</div>
                    <div className="text-sm text-gray-800">{d.dropoffAddress || d.order?.deliveryAddress || '—'}</div>
                  </div>
                </div>
              </div>

              {d.order?.user && (
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{d.order.user.fullName || d.order.user.name || '—'}</span>
                  </div>
                  {d.order.user.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{d.order.user.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons based on status */}
              {d.status === 'ASSIGNED' && (
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => updateStatus(d.id, 'PICKED_UP')}
                    disabled={updatingId === d.id}
                    className="flex-1 bg-secondary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                  >
                    {updatingId === d.id ? t.loading : c('RDP_PICK_UP_ORDER', t.pickUpOrder)}
                  </button>
                </div>
              )}
              {d.status === 'PICKED_UP' && (
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => updateStatus(d.id, 'DELIVERED')}
                    disabled={updatingId === d.id}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {updatingId === d.id ? t.loading : c('RDP_MARK_DELIVERED', t.markDelivered)}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
