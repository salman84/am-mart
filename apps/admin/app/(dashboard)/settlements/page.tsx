'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementsApi } from '../../../lib/api';
import { Banknote, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  CALCULATED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  DISPUTED: 'bg-red-100 text-red-700',
  HELD: 'bg-orange-100 text-orange-700',
};

const nextActions: Record<string, Array<{ label: string; status: string; color: string }>> = {
  CALCULATED: [
    { label: 'Approve', status: 'APPROVED', color: 'bg-green-500 hover:bg-green-600 text-white' },
    { label: 'Dispute', status: 'DISPUTED', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
  ],
  APPROVED: [
    { label: 'Mark Paid', status: 'PAID', color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { label: 'Hold', status: 'HELD', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  ],
  DISPUTED: [
    { label: 'Approve', status: 'APPROVED', color: 'bg-green-500 hover:bg-green-600 text-white' },
  ],
  HELD: [
    { label: 'Approve', status: 'APPROVED', color: 'bg-green-500 hover:bg-green-600 text-white' },
    { label: 'Pay', status: 'PAID', color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  ],
};

export default function SettlementsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['settlement-stats'],
    queryFn: () => settlementsApi.getStats().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['settlements', statusFilter],
    queryFn: () => settlementsApi.getAll({ limit: 50, status: statusFilter || undefined }).then(r => r.data),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => settlementsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['settlements'] });
      qc.invalidateQueries({ queryKey: ['settlement-stats'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const stats = statsData?.stats;
  const items: any[] = data?.settlements || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Settlements</h1>
          <p className="text-gray-500 mt-1">Manage driver earnings and payouts</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-gray-600' },
            { label: 'Calculated', value: stats.calculated, color: 'text-blue-600' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600' },
            { label: 'Paid', value: stats.paid, color: 'text-emerald-600' },
            { label: 'Total Paid', value: stats.totalPaidAmount?.toLocaleString(), color: 'text-emerald-700' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {['', 'PENDING', 'CALCULATED', 'APPROVED', 'PAID', 'DISPUTED', 'HELD'].map(s => (
          <button key={s} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
            statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`} onClick={() => setStatusFilter(s)}>{s || 'All'}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Banknote className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No settlements found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Driver</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Period</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Deliveries</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Earnings</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Net</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {item.rider?.user?.fullName || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(item.periodStart).toLocaleDateString()} — {new Date(item.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold">{item.totalDeliveries}</td>
                  <td className="px-4 py-3 text-right text-sm">{item.totalEarnings?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{item.netAmount?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[item.status] || ''}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {nextActions[item.status]?.map(a => (
                        <button key={a.status} className={`px-2 py-1 rounded-lg text-xs font-semibold ${a.color}`}
                          disabled={statusM.isPending}
                          onClick={() => statusM.mutate({ id: item.id, status: a.status })}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
