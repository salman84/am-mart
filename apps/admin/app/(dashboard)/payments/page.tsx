'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../../lib/api';
import { CreditCard, RefreshCw, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['Payments', 'Refunds', 'Payouts'];

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('Payments');
  const [refundNotes, setRefundNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState<any>(null);

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.getAll({ page: 1, limit: 50 }).then((r) => r.data),
    enabled: tab === 'Payments',
  });

  const { data: refundsData, isLoading: loadingRefunds } = useQuery({
    queryKey: ['refunds'],
    queryFn: () => paymentsApi.getRefunds({ page: 1, limit: 50 }).then((r) => r.data),
    enabled: tab === 'Refunds',
  });

  const { data: payoutsData, isLoading: loadingPayouts } = useQuery({
    queryKey: ['payouts'],
    queryFn: () => paymentsApi.getPayouts({ page: 1, limit: 50 }).then((r) => r.data),
    enabled: tab === 'Payouts',
  });

  const processRefundMutation = useMutation({
    mutationFn: ({ id, approved }: any) => paymentsApi.processRefund(id, approved, refundNotes),
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'Refund approved' : 'Refund rejected');
      qc.invalidateQueries({ queryKey: ['refunds'] });
      setProcessingRefund(null);
      setRefundNotes('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const PAYMENT_STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Payments, refunds, and seller payouts</p>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Refund Process Modal */}
      {processingRefund && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-2">Process Refund</h2>
            <p className="text-sm text-gray-500 mb-3">Order #{processingRefund.order?.orderNumber} — ₩{processingRefund.amount?.toLocaleString()}</p>
            <p className="text-sm font-medium mb-1">Reason: <span className="text-gray-600">{processingRefund.reason}</span></p>
            <textarea
              className="form-input min-h-20 resize-none mt-2"
              placeholder="Admin notes (optional)..."
              value={refundNotes}
              onChange={(e) => setRefundNotes(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setProcessingRefund(null)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={() => processRefundMutation.mutate({ id: processingRefund.id, approved: false })}>Reject</button>
              <button className="btn-primary flex-1" onClick={() => processRefundMutation.mutate({ id: processingRefund.id, approved: true })}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'Payments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingPayments ? (
            <div className="flex items-center justify-center h-40"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['Transaction #', 'Customer', 'Amount', 'Method', 'Status', 'Date'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(paymentsData?.payments || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-td font-mono text-sm">{p.transactionId || p.id.slice(0, 12)}</td>
                      <td className="table-td text-sm">{p.user?.fullName}</td>
                      <td className="table-td font-bold">₩{p.amount?.toLocaleString()}</td>
                      <td className="table-td"><span className="badge bg-blue-100 text-blue-700 text-xs">{p.method}</span></td>
                      <td className="table-td"><span className={`badge text-xs ${PAYMENT_STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status}</span></td>
                      <td className="table-td text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Refunds' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingRefunds ? (
            <div className="flex items-center justify-center h-40"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['Order #', 'Customer', 'Amount', 'Reason', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(refundsData?.refunds || []).map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-td font-mono text-sm">#{r.order?.orderNumber}</td>
                      <td className="table-td text-sm">{r.user?.fullName}</td>
                      <td className="table-td font-bold">₩{r.amount?.toLocaleString()}</td>
                      <td className="table-td text-sm text-gray-500 max-w-40 truncate">{r.reason}</td>
                      <td className="table-td">
                        <span className={`badge text-xs ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="table-td text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="table-td">
                        {r.status === 'PENDING' && (
                          <button className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" onClick={() => setProcessingRefund(r)}>
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Payouts' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingPayouts ? (
            <div className="flex items-center justify-center h-40"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>{['Seller', 'Amount', 'Period', 'Status', 'Paid At'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(payoutsData?.payouts || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-td">
                        <div className="font-medium text-sm">{p.seller?.storeName}</div>
                        <div className="text-xs text-gray-400">{p.seller?.user?.fullName}</div>
                      </td>
                      <td className="table-td font-bold">₩{p.amount?.toLocaleString()}</td>
                      <td className="table-td text-sm text-gray-500">{p.periodStart ? `${new Date(p.periodStart).toLocaleDateString()} – ${new Date(p.periodEnd).toLocaleDateString()}` : '—'}</td>
                      <td className="table-td">
                        <span className={`badge text-xs ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                      </td>
                      <td className="table-td text-xs text-gray-500">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
