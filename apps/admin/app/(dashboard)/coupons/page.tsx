'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from '../../../lib/api';
import { Tag, Plus, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = {
  code: '', discountType: 'PERCENTAGE', discountValue: 10,
  minOrderAmount: 0, maxDiscountAmount: null, usageLimit: null,
  expiresAt: '', isActive: true,
};

export default function CouponsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => couponsApi.getAll().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => editingId ? couponsApi.update(editingId, form) : couponsApi.create(form),
    onSuccess: () => {
      toast.success(editingId ? 'Coupon updated' : 'Coupon created');
      qc.invalidateQueries({ queryKey: ['coupons'] });
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => { toast.success('Coupon deleted'); qc.invalidateQueries({ queryKey: ['coupons'] }); },
  });

  const coupons = data?.coupons || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500 mt-1">Manage discount codes and promotions</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(true); setForm(EMPTY); setEditingId(null); }}>
          <Plus className="w-4 h-4" /> Add Coupon
        </button>
      </div>

      {/* Coupon Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Coupon Code</label>
                <input className="form-input mt-1 uppercase" placeholder="e.g. SAVE20" value={form.code} onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Discount Type</label>
                  <select className="form-input mt-1" value={form.discountType} onChange={(e) => setForm((f: any) => ({ ...f, discountType: e.target.value }))}>
                    <option value="PERCENTAGE">Percentage %</option>
                    <option value="FIXED">Fixed Amount ₩</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Value ({form.discountType === 'PERCENTAGE' ? '%' : '₩'})</label>
                  <input type="number" className="form-input mt-1" value={form.discountValue} onChange={(e) => setForm((f: any) => ({ ...f, discountValue: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Min Order (₩)</label>
                  <input type="number" className="form-input mt-1" value={form.minOrderAmount} onChange={(e) => setForm((f: any) => ({ ...f, minOrderAmount: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Max Discount (₩)</label>
                  <input type="number" className="form-input mt-1" placeholder="Unlimited" value={form.maxDiscountAmount || ''} onChange={(e) => setForm((f: any) => ({ ...f, maxDiscountAmount: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Usage Limit</label>
                  <input type="number" className="form-input mt-1" placeholder="Unlimited" value={form.usageLimit || ''} onChange={(e) => setForm((f: any) => ({ ...f, usageLimit: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Expires At</label>
                  <input type="date" className="form-input mt-1" value={form.expiresAt} onChange={(e) => setForm((f: any) => ({ ...f, expiresAt: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="coupon-active" checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <label htmlFor="coupon-active" className="text-sm font-semibold text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => saveMutation.mutate()}>
                {editingId ? 'Update' : 'Create'} Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No coupons created yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Code', 'Discount', 'Min Order', 'Used', 'Limit', 'Expires', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg text-sm">{c.code}</span>
                    </td>
                    <td className="table-td font-semibold">
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₩${c.discountValue?.toLocaleString()}`}
                    </td>
                    <td className="table-td text-sm">₩{c.minOrderAmount?.toLocaleString()}</td>
                    <td className="table-td text-sm">{c.usageCount || 0}</td>
                    <td className="table-td text-sm">{c.usageLimit || '∞'}</td>
                    <td className="table-td text-xs text-gray-500">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="table-td">
                      <span className={`badge text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => { setEditingId(c.id); setForm({ ...c, expiresAt: c.expiresAt ? c.expiresAt.split('T')[0] : '' }); setShowForm(true); }}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={() => { if (confirm('Delete coupon?')) deleteMutation.mutate(c.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
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
