'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '../../../lib/api';
import { Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../lib/useLanguage';

function StatusBadge({ status, activeLabel, inactiveLabel }: { status: string; activeLabel: string; inactiveLabel: string }) {
  if (status === 'ACTIVE') return <span className="badge bg-green-100 text-green-700">{activeLabel}</span>;
  if (status === 'INACTIVE') return <span className="badge bg-gray-100 text-gray-600">{inactiveLabel}</span>;
  return <span className="badge bg-red-100 text-red-700">{status}</span>;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => sellerApi.getMyProducts().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sellerApi.deleteProduct(id),
    onSuccess: () => {
      toast.success(t.success);
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t.error),
  });

  const products: any[] = data?.products || data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.myProducts}</h1>
          <p className="text-gray-500 mt-1">
            {products.length} {products.length !== 1 ? t.myProducts.toLowerCase() : t.myProducts.toLowerCase()}
          </p>
        </div>
        <Link href="/products/add" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t.addProduct}
        </Link>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t.delete}</h2>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-semibold text-gray-900">{deleteTarget.name}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? t.loading : t.delete}
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
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-14 h-14 mx-auto mb-4 opacity-40" />
            <p className="text-base font-medium text-gray-600">{t.noProducts}</p>
            <p className="text-sm mt-1 mb-6">{t.addFirstProduct}</p>
            <Link href="/products/add" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t.addFirstProduct}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[t.productName, t.price, 'Discount', t.stock, t.status, t.actions].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p: any) => {
                  const imageUrl = p.images?.[0]?.url || p.imageUrl || null;
                  const status = p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE');
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900 max-w-[180px] truncate">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-400">{p.category?.name || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td font-semibold text-gray-900">
                        ₩{(p.price || 0).toLocaleString()}
                      </td>
                      <td className="table-td text-green-600 font-medium">
                        {p.discountPrice ? `₩${p.discountPrice.toLocaleString()}` : '—'}
                      </td>
                      <td className="table-td">
                        <span
                          className={`font-semibold ${(p.stock || 0) < 5 ? 'text-red-500' : 'text-gray-800'}`}
                        >
                          {p.stock ?? 0}
                        </span>
                      </td>
                      <td className="table-td">
                        <StatusBadge status={status} activeLabel={t.active} inactiveLabel={t.inactive} />
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/products/edit/${p.id}`}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            aria-label={t.edit}
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            aria-label={t.delete}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
