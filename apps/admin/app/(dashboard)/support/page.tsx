'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../../../lib/api';
import { MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export default function SupportPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['support', statusFilter],
    queryFn: () => supportApi.getAll({ status: statusFilter, page: 1, limit: 50 }).then((r) => r.data),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: any) => supportApi.reply(id, message),
    onSuccess: () => {
      toast.success('Reply sent');
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['support'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => supportApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Ticket updated'); qc.invalidateQueries({ queryKey: ['support'] }); },
  });

  const tickets = data?.tickets || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-500 mt-1">Customer support and issue management</p>
        </div>
        <div className="text-sm text-gray-500">Total: {data?.total || 0}</div>
      </div>

      <div className="flex gap-2 mb-6">
        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold">{selectedTicket.subject}</h2>
                <p className="text-sm text-gray-500">{selectedTicket.user?.fullName} · {new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">{selectedTicket.message}</div>
              {(selectedTicket.replies || []).map((reply: any) => (
                <div key={reply.id} className={`rounded-xl p-3 text-sm ${reply.isAdmin ? 'bg-primary/10 text-primary ml-8' : 'bg-gray-50 text-gray-700 mr-8'}`}>
                  <p className="font-semibold text-xs mb-1">{reply.isAdmin ? 'Admin' : selectedTicket.user?.fullName}</p>
                  {reply.message}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                className="form-input flex-1 min-h-16 resize-none text-sm"
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button
                className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 self-end"
                onClick={() => replyMutation.mutate({ id: selectedTicket.id, message: replyText })}
                disabled={!replyText.trim()}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              {selectedTicket.status === 'OPEN' && (
                <button className="btn-secondary text-xs flex-1" onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status: 'IN_PROGRESS' })}>Mark In Progress</button>
              )}
              {['OPEN', 'IN_PROGRESS'].includes(selectedTicket.status) && (
                <button className="btn-primary text-xs flex-1" onClick={() => { updateStatusMutation.mutate({ id: selectedTicket.id, status: 'RESOLVED' }); setSelectedTicket(null); }}>Resolve</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No {statusFilter.toLowerCase()} tickets</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t: any) => (
              <div
                key={t.id}
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-start justify-between gap-4"
                onClick={() => setSelectedTicket(t)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{t.subject}</span>
                    <span className={`badge text-xs ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{t.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.user?.fullName} · {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">{t.replies?.length || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
