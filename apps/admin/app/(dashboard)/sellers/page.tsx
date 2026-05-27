'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellersApi } from '../../../lib/api';
import { CheckCircle, XCircle, Eye, Store } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-gray-100 text-gray-700',
};

export default function SellersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', statusFilter],
    queryFn: () => sellersApi.getAll({ status: statusFilter, page: 1, limit: 50 }).then((r) => r.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: any) => sellersApi.updateStatus(id, status, reason),
    onSuccess: () => { toast.success('Seller status updated!'); qc.invalidateQueries({ queryKey: ['sellers'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const sellers = data?.sellers || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Management</h1>
          <p className="text-gray-500 mt-1">Review and manage seller applications</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${statusFilter === status ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">Rejection Reason</h2>
            <textarea
              className="form-input min-h-24 resize-none"
              placeholder="Provide reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => { setRejectingId(null); setRejectionReason(''); }}>Cancel</button>
              <button
                className="btn-danger flex-1"
                onClick={() => { updateStatusMutation.mutate({ id: rejectingId, status: 'REJECTED', reason: rejectionReason }); setRejectingId(null); setRejectionReason(''); }}
              >
                Reject Seller
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : sellers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No {statusFilter.toLowerCase()} sellers</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Store', 'Owner', 'Phone', 'Commission', 'Sales', 'Status', 'Applied', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sellers.map((seller: any) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Store className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{seller.storeName}</div>
                          <div className="text-xs text-gray-400">{seller.businessRegNumber || 'No reg#'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">{seller.user?.fullName}</td>
                    <td className="table-td text-gray-500">{seller.user?.phone}</td>
                    <td className="table-td">
                      <span className="badge bg-purple-100 text-purple-700">{seller.commissionRate}%</span>
                    </td>
                    <td className="table-td">{seller.totalSales}</td>
                    <td className="table-td">
                      <span className={`badge ${STATUS_COLORS[seller.sellerStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {seller.sellerStatus}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-500">{new Date(seller.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        {seller.sellerStatus === 'PENDING' && (
                          <>
                            <button
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                              title="Approve"
                              onClick={() => updateStatusMutation.mutate({ id: seller.id, status: 'APPROVED' })}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                              title="Reject"
                              onClick={() => setRejectingId(seller.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {seller.sellerStatus === 'APPROVED' && (
                          <button
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                            title="Suspend"
                            onClick={() => updateStatusMutation.mutate({ id: seller.id, status: 'SUSPENDED' })}
                          >
                            Suspend
                          </button>
                        )}
                      </div>
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
