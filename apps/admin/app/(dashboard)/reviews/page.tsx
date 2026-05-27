'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../../lib/api';
import { Star, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

function StatusBadge({ approved }: { approved: boolean }) {
  if (approved) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Approved</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>;
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'approved'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['reviews-admin', filter],
    queryFn: () =>
      reviewsApi
        .getAll(filter === 'approved' ? { approved: true } : undefined)
        .then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      reviewsApi.toggleApproval(id, approved),
    onSuccess: (_, vars) => {
      toast.success(vars.approved ? 'Review approved' : 'Review rejected');
      qc.invalidateQueries({ queryKey: ['reviews-admin'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Action failed'),
  });

  const reviews: any[] = data?.reviews || data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 mt-1">Moderate customer product reviews</p>
        </div>
        <span className="text-sm text-gray-400">Total: {data?.total ?? reviews.length}</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'approved'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === tab
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab === 'all' ? 'All' : 'Approved'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/5" />
                <div className="h-4 bg-gray-200 rounded w-1/5" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-2/5" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No reviews found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Customer', 'Product', 'Rating', 'Comment', 'Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviews.map((review: any) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="font-medium text-sm text-gray-900">
                        {review.customer?.name || review.user?.name || review.customerName || '—'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {review.customer?.email || review.user?.email || ''}
                      </div>
                    </td>
                    <td className="table-td text-sm text-gray-700">
                      {review.product?.name || review.productName || '—'}
                    </td>
                    <td className="table-td">
                      <StarRating rating={review.rating || 0} />
                      <span className="text-xs text-gray-400 ml-1">{review.rating}/5</span>
                    </td>
                    <td className="table-td max-w-xs">
                      <p className="text-sm text-gray-600 truncate" title={review.comment}>
                        {review.comment || <span className="text-gray-300 italic">No comment</span>}
                      </p>
                    </td>
                    <td className="table-td text-sm text-gray-500 whitespace-nowrap">
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="table-td">
                      <StatusBadge approved={review.isApproved ?? review.approved ?? false} />
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        {!(review.isApproved ?? review.approved) ? (
                          <button
                            type="button"
                            aria-label="Approve review"
                            className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold disabled:opacity-50"
                            disabled={toggleMutation.isPending}
                            onClick={() => toggleMutation.mutate({ id: review.id, approved: true })}
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Reject review"
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold disabled:opacity-50"
                            disabled={toggleMutation.isPending}
                            onClick={() => toggleMutation.mutate({ id: review.id, approved: false })}
                          >
                            Reject
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
