'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../../lib/api';
import { ArrowLeftRight, Eye, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  IN_TRANSIT: 'bg-purple-100 text-purple-700',
  RECEIVED: 'bg-green-100 text-green-700',
  PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const nextActions: Record<string, Array<{ label: string; status: string; color: string }>> = {
  REQUESTED: [
    { label: 'Approve', status: 'APPROVED', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { label: 'Cancel', status: 'CANCELLED', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
  ],
  APPROVED: [
    { label: 'Mark Shipped', status: 'SHIPPED', color: 'bg-indigo-500 hover:bg-indigo-600 text-white' },
    { label: 'Cancel', status: 'CANCELLED', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
  ],
  SHIPPED: [
    { label: 'In Transit', status: 'IN_TRANSIT', color: 'bg-purple-500 hover:bg-purple-600 text-white' },
  ],
  IN_TRANSIT: [
    { label: 'Mark Received', status: 'RECEIVED', color: 'bg-green-500 hover:bg-green-600 text-white' },
    { label: 'Partial', status: 'PARTIALLY_RECEIVED', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
  ],
  PARTIALLY_RECEIVED: [
    { label: 'Mark Fully Received', status: 'RECEIVED', color: 'bg-green-500 hover:bg-green-600 text-white' },
  ],
};

function TransferDetail({ transfer, onClose }: { transfer: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Transfer: {transfer.transferNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-xs text-gray-400">From</span>
            <div className="font-semibold">{transfer.originFulfillment?.name || 'Seller Direct'}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400">To</span>
            <div className="font-semibold">{transfer.destinationFulfillment?.name || '—'}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Status</span>
            <div><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[transfer.status] || ''}`}>{transfer.status}</span></div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Total Items</span>
            <div className="font-semibold">{transfer.totalItems} (received: {transfer.totalReceived})</div>
          </div>
        </div>
        {transfer.items?.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Items</h3>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product ID</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Expected</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Received</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Damaged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfer.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-mono text-gray-700">{item.productId.slice(0, 12)}...</td>
                    <td className="px-3 py-2 text-center">{item.expectedQuantity}</td>
                    <td className="px-3 py-2 text-center font-semibold text-green-600">{item.receivedQuantity}</td>
                    <td className="px-3 py-2 text-center text-red-600">{item.damagedQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {transfer.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">{transfer.notes}</div>
        )}
        <div className="flex justify-end pt-4">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function WarehouseTransfersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [detailTransfer, setDetailTransfer] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-transfers', statusFilter],
    queryFn: () => warehouseApi.getTransfers({
      limit: 50, status: statusFilter || undefined,
    }).then(r => r.data),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      warehouseApi.updateTransferStatus(id, status, notes),
    onSuccess: () => {
      toast.success('Transfer updated');
      qc.invalidateQueries({ queryKey: ['warehouse-transfers'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const transfers: any[] = data?.transfers || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Transfers</h1>
          <p className="text-gray-500 mt-1">Manage incoming stock transfers from sellers</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'REQUESTED', 'APPROVED', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'PARTIALLY_RECEIVED'].map(s => (
          <button key={s}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {detailTransfer && (
        <TransferDetail transfer={detailTransfer} onClose={() => setDetailTransfer(null)} />
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>
        </div>
      ) : transfers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No transfers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Transfer #</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Origin</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Destination</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Items</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{t.transferNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {t.originFulfillment?.name || t.originType || 'Seller'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.destinationFulfillment?.name || '—'}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span className="font-semibold">{t.totalReceived}</span>
                    <span className="text-gray-400">/{t.totalItems}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[t.status] || ''}`}>
                      {t.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        onClick={() => setDetailTransfer(t)}>
                        <Eye className="w-4 h-4" />
                      </button>
                      {nextActions[t.status]?.map(action => (
                        <button key={action.status}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${action.color}`}
                          disabled={statusM.isPending}
                          onClick={() => statusM.mutate({ id: t.id, status: action.status })}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Total: {data?.total || transfers.length} transfers
          </div>
        </div>
      )}
    </div>
  );
}
