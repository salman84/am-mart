'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '../../../lib/api';
import { ShoppingBag, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../lib/useLanguage';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const TAB_KEYS = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERED', 'CANCELLED'] as const;

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export default function OrdersPage() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const tabLabels: Record<string, string> = {
    ALL: t.all,
    PENDING: t.pending,
    CONFIRMED: t.confirmed,
    PREPARING: t.preparing,
    DELIVERED: t.delivered,
    CANCELLED: t.cancelled,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['seller-orders', activeTab],
    queryFn: () =>
      sellerApi
        .getOrders(activeTab !== 'ALL' ? { status: activeTab } : undefined)
        .then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sellerApi.updateOrderStatus(id, status),
    onSuccess: () => {
      toast.success(t.success);
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
      setUpdatingId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t.error);
      setUpdatingId(null);
    },
  });

  const orders: any[] = data?.orders || data || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.orders}</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 flex-wrap bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-600">{t.noOrders}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[t.orderNumber, t.customer, t.items, t.total, t.orderStatus, t.date, t.updateStatus].map(
                    (h) => (
                      <th key={h} className="table-th">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order: any) => {
                  const nextStatuses = NEXT_STATUSES[order.status] || [];
                  const isUpdating = updatingId === order.id && updateMutation.isPending;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="table-td font-mono font-semibold text-gray-900">
                        #{order.orderNumber || order.id?.slice(-6).toUpperCase()}
                      </td>
                      <td className="table-td text-gray-600">
                        {order.customer?.fullName ||
                          order.user?.fullName ||
                          order.customerName ||
                          t.customer}
                      </td>
                      <td className="table-td text-gray-500">
                        <div className="max-w-[160px]">
                          {order.items?.length > 0 ? (
                            <div>
                              <span className="font-medium text-gray-700">
                                {order.items[0]?.product?.name ||
                                  order.items[0]?.name ||
                                  t.items}
                              </span>
                              {order.items.length > 1 && (
                                <span className="text-xs text-gray-400 ml-1">
                                  +{order.items.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            `${order.itemCount || 1}`
                          )}
                        </div>
                      </td>
                      <td className="table-td font-semibold text-gray-900">
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
                      <td className="table-td">
                        {nextStatuses.length > 0 ? (
                          <div className="relative">
                            <select
                              aria-label={t.updateStatus}
                              className="appearance-none text-xs border border-gray-200 rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white cursor-pointer disabled:opacity-50"
                              value=""
                              disabled={isUpdating}
                              onChange={(e) => {
                                if (!e.target.value) return;
                                setUpdatingId(order.id);
                                updateMutation.mutate({
                                  id: order.id,
                                  status: e.target.value,
                                });
                              }}
                            >
                              <option value="">{isUpdating ? t.loading : t.updateStatus}</option>
                              {nextStatuses.map((s) => (
                                <option key={s} value={s}>
                                  → {s.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
