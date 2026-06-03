'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { returnsApi } from '../../../lib/api';
import { RotateCcw, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  PICKUP_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  RETURN_RECEIVED: 'bg-purple-100 text-purple-700',
  INSPECTING: 'bg-cyan-100 text-cyan-700',
  REFUND_APPROVED: 'bg-green-100 text-green-700',
  REFUND_REJECTED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const nextActions: Record<string, Array<{ label: string; status: string; color: string }>> = {
  REQUESTED: [
    { label: 'Approve', status: 'APPROVED', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { label: 'Reject', status: 'REJECTED', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
  ],
  APPROVED: [
    { label: 'Schedule Pickup', status: 'PICKUP_SCHEDULED', color: 'bg-indigo-500 hover:bg-indigo-600 text-white' },
  ],
  RETURN_RECEIVED: [
    { label: 'Start Inspection', status: 'INSPECTING', color: 'bg-cyan-500 hover:bg-cyan-600 text-white' },
  ],
  REFUND_APPROVED: [
    { label: 'Mark Refunded', status: 'REFUNDED', color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  ],
};

function DetailModal({ item, onClose }: { item: any; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['return-detail', item.id],
    queryFn: () => returnsApi.getOne(item.id).then(r => r.data),
  });
  const detail = data?.request || item;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Return Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3 text-sm">
          <div><span className="text-gray-400">Order:</span> <span className="font-semibold">{detail.orderId?.slice(0, 8)}...</span></div>
          <div><span className="text-gray-400">Reason:</span> <span>{detail.reason}</span></div>
          {detail.description && <div><span className="text-gray-400">Description:</span> <span>{detail.description}</span></div>}
          <div><span className="text-gray-400">Status:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[detail.status] || ''}`}>{detail.status}</span></div>
          {detail.refundAmount && <div><span className="text-gray-400">Refund Amount:</span> <span className="font-bold text-green-600">{detail.refundAmount?.toLocaleString()}</span></div>}
          {detail.adminNotes && <div className="p-3 bg-gray-50 rounded-lg">{detail.adminNotes}</div>}
          {detail.returnPickup && (
            <div className="border-t pt-3 mt-3">
              <h4 className="font-semibold mb-1">Pickup</h4>
              <div>Status: {detail.returnPickup.status}</div>
              {detail.returnPickup.rider && <div>Driver: {detail.returnPickup.rider.user?.fullName}</div>}
            </div>
          )}
          {detail.returnInspection && (
            <div className="border-t pt-3 mt-3">
              <h4 className="font-semibold mb-1">Inspection</h4>
              <div>Condition: {detail.returnInspection.condition}</div>
              <div>Refund: {detail.returnInspection.refundApproved ? 'Approved' : 'Rejected'}</div>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4"><button className="btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-returns', statusFilter],
    queryFn: () => returnsApi.getAll({ limit: 50, status: statusFilter || undefined }).then(r => r.data),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => returnsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-returns'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const items: any[] = data?.requests || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns & Reverse Logistics</h1>
          <p className="text-gray-500 mt-1">Manage return requests, pickups, and inspections</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {['', 'REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'RETURN_RECEIVED', 'INSPECTING', 'REFUND_APPROVED', 'REFUNDED'].map(s => (
          <button key={s} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
            statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`} onClick={() => setStatusFilter(s)}>{s || 'All'}</button>
        ))}
      </div>

      {detail && <DetailModal item={detail} onClose={() => setDetail(null)} />}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No return requests found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Order</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Refund</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-700">{item.orderId?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[item.status] || ''}`}>
                      {item.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    {item.refundAmount ? item.refundAmount.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => setDetail(item)}>
                        <Eye className="w-4 h-4" />
                      </button>
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
