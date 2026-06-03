'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi } from '../../../lib/api';
import { DollarSign, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const FEE_TYPES = ['FLAT', 'WEIGHT_BASED', 'DISTANCE_BASED', 'ZONE_BASED', 'COMBINED'];
const BLANK = {
  name: '', feeType: 'FLAT', baseFee: 3000, perKgFee: 0, perKmFee: 0,
  freeShippingThreshold: '', expressMultiplier: 1.5, surgeMultiplier: 1.0,
  minFee: 0, maxFee: '', priority: 0, isActive: true,
};
type Form = typeof BLANK;

const typeColors: Record<string, string> = {
  FLAT: 'bg-blue-100 text-blue-700',
  WEIGHT_BASED: 'bg-green-100 text-green-700',
  DISTANCE_BASED: 'bg-purple-100 text-purple-700',
  ZONE_BASED: 'bg-orange-100 text-orange-700',
  COMBINED: 'bg-pink-100 text-pink-700',
};

function Modal({
  title, form, setForm, onSubmit, onClose, loading,
}: {
  title: string; form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="form-label">Rule Name *</label>
            <input className="form-input" required value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Delivery" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fee Type</label>
              <select className="form-input" value={form.feeType}
                onChange={(e) => setForm(f => ({ ...f, feeType: e.target.value }))}>
                {FEE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <input className="form-input" type="number" value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Base Fee</label>
              <input className="form-input" type="number" min={0} step="100" value={form.baseFee}
                onChange={(e) => setForm(f => ({ ...f, baseFee: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Per Kg Fee</label>
              <input className="form-input" type="number" min={0} step="100" value={form.perKgFee}
                onChange={(e) => setForm(f => ({ ...f, perKgFee: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Per Km Fee</label>
              <input className="form-input" type="number" min={0} step="100" value={form.perKmFee}
                onChange={(e) => setForm(f => ({ ...f, perKmFee: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Min Fee</label>
              <input className="form-input" type="number" min={0} step="100" value={form.minFee}
                onChange={(e) => setForm(f => ({ ...f, minFee: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Max Fee</label>
              <input className="form-input" type="number" min={0} step="100" value={form.maxFee}
                onChange={(e) => setForm(f => ({ ...f, maxFee: e.target.value }))} placeholder="No limit" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Express Multiplier</label>
              <input className="form-input" type="number" min={1} step="0.1" value={form.expressMultiplier}
                onChange={(e) => setForm(f => ({ ...f, expressMultiplier: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Free Shipping Above</label>
              <input className="form-input" type="number" min={0} step="1000" value={form.freeShippingThreshold}
                onChange={(e) => setForm(f => ({ ...f, freeShippingThreshold: e.target.value }))} placeholder="No threshold" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isActive ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <label className="text-sm font-medium text-gray-700">{form.isActive ? 'Active' : 'Inactive'}</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FeeRulesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Form>({ ...BLANK });

  const { data, isLoading } = useQuery({
    queryKey: ['fee-rules'],
    queryFn: () => routesApi.getFeeRules().then(r => r.data),
  });

  const createM = useMutation({
    mutationFn: (d: any) => routesApi.createFeeRule(d),
    onSuccess: () => { toast.success('Rule created'); qc.invalidateQueries({ queryKey: ['fee-rules'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => routesApi.updateFeeRule(id, d),
    onSuccess: () => { toast.success('Rule updated'); qc.invalidateQueries({ queryKey: ['fee-rules'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => routesApi.deleteFeeRule(id),
    onSuccess: () => { toast.success('Rule deleted'); qc.invalidateQueries({ queryKey: ['fee-rules'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(r: any) {
    setEditing(r);
    setForm({
      name: r.name, feeType: r.feeType || 'FLAT', baseFee: r.baseFee ?? 0,
      perKgFee: r.perKgFee ?? 0, perKmFee: r.perKmFee ?? 0,
      freeShippingThreshold: r.freeShippingThreshold != null ? String(r.freeShippingThreshold) : '',
      expressMultiplier: r.expressMultiplier ?? 1.5, surgeMultiplier: r.surgeMultiplier ?? 1.0,
      minFee: r.minFee ?? 0, maxFee: r.maxFee != null ? String(r.maxFee) : '',
      priority: r.priority ?? 0, isActive: r.isActive ?? true,
    });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      ...form,
      freeShippingThreshold: form.freeShippingThreshold ? Number(form.freeShippingThreshold) : undefined,
      maxFee: form.maxFee ? Number(form.maxFee) : undefined,
    };
    if (editing) updateM.mutate({ id: editing.id, d: payload });
    else createM.mutate(payload);
  }

  const rules: any[] = data?.rules || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Fee Rules</h1>
          <p className="text-gray-500 mt-1">Configure pricing rules for parcel delivery</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Rule' : 'Add Rule'} form={form} setForm={setForm}
          onSubmit={handleSubmit} onClose={closeModal}
          loading={createM.isPending || updateM.isPending} />
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded" />)}</div>
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No fee rules configured</p>
          <button className="btn-primary" onClick={openCreate}>Add First Rule</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Rule</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Base Fee</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Per Kg</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Express</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Priority</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 text-sm">{r.name}</div>
                    {r.zone && <div className="text-xs text-gray-400">{r.zone.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[r.feeType] || ''}`}>
                      {r.feeType?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{r.baseFee?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.perKgFee > 0 ? r.perKgFee?.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.expressMultiplier}x</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.priority}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{r.isActive ? 'Active' : 'Off'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                        onClick={() => { if (confirm(`Delete "${r.name}"?`)) deleteM.mutate(r.id); }}>
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
  );
}
