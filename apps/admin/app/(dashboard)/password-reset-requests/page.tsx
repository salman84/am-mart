'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { passwordResetApi } from '../../../lib/api';
import { KeyRound, Copy, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  EXPIRED:   'bg-gray-100 text-gray-500',
};

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];

export default function PasswordResetRequestsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [approvedToken, setApprovedToken] = useState<{ token: string; expiresAt: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['password-reset-requests', statusFilter],
    queryFn: () =>
      passwordResetApi
        .getAll({ status: statusFilter === 'ALL' ? undefined : statusFilter, page: 1, limit: 50 })
        .then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      passwordResetApi.approve(id, adminNote),
    onSuccess: (res) => {
      toast.success('Request approved');
      setApprovedToken({ token: res.data.resetToken, expiresAt: res.data.expiresAt });
      qc.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      passwordResetApi.reject(id, adminNote),
    onSuccess: () => {
      toast.success('Request rejected');
      setRejectModal(null);
      setRejectNote('');
      qc.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reject'),
  });

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    });
  };

  const requests = data?.requests || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Password Reset Requests</h1>
          <p className="text-gray-500 mt-1">Manual account recovery — review and approve or reject</p>
        </div>
        <div className="text-sm text-gray-500">Total: {data?.total || 0}</div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              statusFilter === f ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Approved token modal */}
      {approvedToken && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Reset Token Generated</h2>
              <button onClick={() => setApprovedToken(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share this code with the user. It expires in 10 minutes.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm font-mono text-gray-800 break-all flex-1">{approvedToken.token}</code>
                <button
                  onClick={() => copyToken(approvedToken.token)}
                  className="flex-shrink-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Expires: {new Date(approvedToken.expiresAt).toLocaleString()}
            </p>
            <button
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90"
              onClick={() => setApprovedToken(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Reject Request</h2>
              <button onClick={() => { setRejectModal(null); setRejectNote(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              className="form-input w-full min-h-20 resize-none text-sm mb-4"
              placeholder="Admin note (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                onClick={() => { setRejectModal(null); setRejectNote(''); }}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, adminNote: rejectNote || undefined })}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <KeyRound className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase() + ' '}password reset requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email / Username</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Matched Account</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString()}
                      <div className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-800">{req.enteredPhone}</td>
                    <td className="px-4 py-3 text-gray-800">{req.enteredName}</td>
                    <td className="px-4 py-3 text-gray-500">{req.enteredEmailOrUsername || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {req.matchedUser ? (
                        <div>
                          <div className="font-semibold text-gray-800">{req.matchedUser.fullName}</div>
                          <div className="text-xs text-gray-400">{req.matchedUser.phone}</div>
                          {req.matchedUser.email && (
                            <div className="text-xs text-gray-400">{req.matchedUser.email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-red-400 font-medium">No match found</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}`}>
                        {req.status}
                      </span>
                      {req.adminNote && (
                        <div className="text-xs text-gray-400 mt-1 max-w-[140px] truncate" title={req.adminNote}>
                          {req.adminNote}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 disabled:opacity-60"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate({ id: req.id })}
                          >
                            Approve
                          </button>
                          <button
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600"
                            onClick={() => setRejectModal({ id: req.id })}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === 'APPROVED' && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium text-green-600">Token issued</span>
                          {req.expiresAt && (
                            <div className="text-gray-400">
                              Expires: {new Date(req.expiresAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      )}
                      {(req.status === 'REJECTED' || req.status === 'COMPLETED' || req.status === 'EXPIRED') && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
