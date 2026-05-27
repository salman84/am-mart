'use client';

import { useQuery } from '@tanstack/react-query';
import { topupApi } from '../../../lib/api';
import { Smartphone } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

export default function TopupOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['topup-orders'],
    queryFn: () => topupApi.getOrders({ page: 1, limit: 50 }).then((r) => r.data),
  });

  const orders = data?.orders || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Top-Up Orders</h1>
          <p className="text-gray-500 mt-1">International and local mobile top-up transactions</p>
        </div>
        <div className="text-sm text-gray-500">Total: {data?.total || 0}</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No top-up orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Order #', 'Customer', 'Phone', 'Country', 'Operator', 'Amount', 'Total (₩)', 'Status', 'Date'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono font-semibold text-sm">#{o.orderNumber || o.id.slice(0, 8)}</td>
                    <td className="table-td">
                      <div className="font-medium text-sm">{o.user?.fullName}</div>
                      <div className="text-xs text-gray-400">{o.user?.phone}</div>
                    </td>
                    <td className="table-td text-sm">{o.recipientPhone}</td>
                    <td className="table-td">
                      <span className="text-base mr-1">{o.country?.flag}</span>
                      <span className="text-sm">{o.country?.name || o.countryCode}</span>
                    </td>
                    <td className="table-td text-sm text-gray-500">{o.operator}</td>
                    <td className="table-td text-sm">{o.amount} {o.currency}</td>
                    <td className="table-td font-bold">₩{o.totalKRW?.toLocaleString()}</td>
                    <td className="table-td">
                      <span className={`badge text-xs ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
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
