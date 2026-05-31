'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from '../../../lib/api';
import { Tag, Plus, Trash2, Pencil, Power, PowerOff, Gift, Users, Star, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = {
  code: '',
  title: '',
  description: '',
  type: 'PERCENTAGE',
  category: 'MANUAL',
  value: 10,
  minOrderAmount: 0,
  maxDiscount: null as number | null,
  usageLimit: null as number | null,
  perUserLimit: 1,
  isActive: true,
  autoAssign: false,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
};

const CATEGORIES = [
  { id: 'MANUAL',           label: 'Manual Code',       icon: Tag,         color: 'bg-gray-100 text-gray-700',    desc: 'Customer enters a code at checkout' },
  { id: 'WELCOME',          label: 'Welcome Bonus',     icon: Gift,        color: 'bg-purple-100 text-purple-700', desc: 'Auto-assigned when a new user registers' },
  { id: 'FIRST_PURCHASE',   label: 'First Purchase',    icon: ShoppingBag, color: 'bg-blue-100 text-blue-700',    desc: 'Auto-assigned; valid only on the first order' },
  { id: 'REFERRAL_SENDER',  label: 'Referral Reward',   icon: Users,       color: 'bg-green-100 text-green-700',  desc: "Rewarded to the referrer when their friend signs up" },
  { id: 'REFERRAL_RECEIVER',label: 'Referral Signup',   icon: Star,        color: 'bg-orange-100 text-orange-700',desc: 'Assigned to the new user who signed up via referral' },
];

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const Icon = cat.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>
      <Icon className="w-3 h-3" />
      {cat.label}
    </span>
  );
}

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
    mutationFn: () =>
      editingId ? couponsApi.update(editingId, form) : couponsApi.create(form),
    onSuccess: () => {
      toast.success(editingId ? 'Coupon updated' : 'Coupon created');
      qc.invalidateQueries({ queryKey: ['coupons'] });
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => couponsApi.toggle(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: () => toast.error('Failed to toggle coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => {
      toast.success('Coupon deleted');
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const coupons = data?.coupons || [];
  const selectedCategory = CATEGORIES.find((c) => c.id === form.category) ?? CATEGORIES[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500 mt-1">Manage discount codes and promotions</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => { setShowForm(true); setForm(EMPTY); setEditingId(null); }}
        >
          <Plus className="w-4 h-4" /> Add Coupon
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = coupons.filter((c: any) => c.category === cat.id).length;
          return (
            <div key={cat.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className={`p-1.5 rounded-lg ${cat.color}`}><Icon className="w-4 h-4" /></span>
                <span className="text-xs font-semibold text-gray-600">{cat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Coupon Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Coupon Category</label>
                <div className="grid grid-cols-1 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm((f: any) => ({ ...f, category: cat.id, autoAssign: cat.id !== 'MANUAL' }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          form.category === cat.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <span className={`p-2 rounded-lg ${cat.color}`}><Icon className="w-4 h-4" /></span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{cat.label}</p>
                          <p className="text-xs text-gray-500">{cat.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code + Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Coupon Code</label>
                  <input
                    className="form-input mt-1 uppercase"
                    placeholder="e.g. SAVE20"
                    value={form.code}
                    onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Title</label>
                  <input
                    className="form-input mt-1"
                    placeholder="e.g. Welcome Bonus"
                    value={form.title}
                    onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Description (optional)</label>
                <input
                  className="form-input mt-1"
                  placeholder="Short description shown to users"
                  value={form.description}
                  onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Discount Type</label>
                  <select
                    className="form-input mt-1"
                    value={form.type}
                    onChange={(e) => setForm((f: any) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="PERCENTAGE">Percentage %</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Value ({form.type === 'PERCENTAGE' ? '%' : 'amount'})
                  </label>
                  <input
                    type="number"
                    className="form-input mt-1"
                    value={form.value}
                    onChange={(e) => setForm((f: any) => ({ ...f, value: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Min order + max discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Min Order Amount</label>
                  <input
                    type="number"
                    className="form-input mt-1"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm((f: any) => ({ ...f, minOrderAmount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Max Discount</label>
                  <input
                    type="number"
                    className="form-input mt-1"
                    placeholder="Unlimited"
                    value={form.maxDiscount || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, maxDiscount: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Total Usage Limit</label>
                  <input
                    type="number"
                    className="form-input mt-1"
                    placeholder="Unlimited"
                    value={form.usageLimit || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, usageLimit: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Per User Limit</label>
                  <input
                    type="number"
                    className="form-input mt-1"
                    value={form.perUserLimit}
                    min={1}
                    onChange={(e) => setForm((f: any) => ({ ...f, perUserLimit: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    className="form-input mt-1"
                    value={form.startDate}
                    onChange={(e) => setForm((f: any) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">End Date</label>
                  <input
                    type="date"
                    className="form-input mt-1"
                    value={form.endDate}
                    onChange={(e) => setForm((f: any) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-semibold text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoAssign}
                    onChange={(e) => setForm((f: any) => ({ ...f, autoAssign: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-semibold text-gray-700">Auto-assign to users</span>
                </label>
              </div>

              {form.autoAssign && form.category === 'MANUAL' && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  ⚠ Auto-assign is most useful for Welcome, First Purchase, or Referral categories.
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : editingId ? 'Update Coupon' : 'Create Coupon'}
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
                  {['Code', 'Category', 'Discount', 'Min Order', 'Used / Limit', 'Valid Until', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div>
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg text-sm">
                          {c.code}
                        </span>
                        {c.autoAssign && (
                          <span className="ml-1 text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">
                            Auto
                          </span>
                        )}
                        {c.title && <p className="text-xs text-gray-500 mt-1">{c.title}</p>}
                      </div>
                    </td>
                    <td className="table-td">
                      <CategoryBadge category={c.category || 'MANUAL'} />
                    </td>
                    <td className="table-td font-semibold">
                      {c.discountType === 'PERCENTAGE' || c.type === 'PERCENTAGE'
                        ? `${c.discountValue ?? c.value}%`
                        : `${(c.discountValue ?? c.value)?.toLocaleString()}`}
                    </td>
                    <td className="table-td text-sm">
                      {(c.minOrderAmount || 0).toLocaleString()}
                    </td>
                    <td className="table-td text-sm">
                      <span className="font-semibold">{c.usageCount || 0}</span>
                      <span className="text-gray-400"> / {c.usageLimit ?? '∞'}</span>
                    </td>
                    <td className="table-td text-xs text-gray-500">
                      {c.expiresAt || c.endDate
                        ? new Date(c.expiresAt || c.endDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="table-td">
                      <span className={`badge text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1.5">
                        {/* Start / Stop toggle — most prominent action */}
                        <button
                          title={c.isActive ? 'Stop coupon' : 'Start coupon'}
                          className={`p-1.5 rounded-lg ${
                            c.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                          onClick={() => toggleMutation.mutate(c.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {c.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          title="Edit"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                          onClick={() => {
                            setEditingId(c.id);
                            setForm({
                              ...c,
                              type: c.type || c.discountType || 'PERCENTAGE',
                              value: c.value ?? c.discountValue ?? 0,
                              maxDiscount: c.maxDiscount ?? c.maxDiscountAmount ?? null,
                              category: c.category || 'MANUAL',
                              startDate: c.startDate ? c.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
                              endDate: (c.endDate || c.expiresAt) ? (c.endDate || c.expiresAt).split('T')[0] : '',
                              autoAssign: c.autoAssign ?? false,
                              perUserLimit: c.perUserLimit ?? 1,
                            });
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete"
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          onClick={() => { if (confirm('Delete coupon?')) deleteMutation.mutate(c.id); }}
                        >
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
