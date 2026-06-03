'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../../lib/api';
import { Box, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const BIN_TYPES = ['STANDARD', 'COLD_STORAGE', 'FRAGILE', 'OVERSIZED'];
const BLANK = { binCode: '', section: '', aisle: '', shelf: '', position: '', capacity: 100, binType: 'STANDARD' };
type BinForm = typeof BLANK;

function BinModal({
  title, form, setForm, onSubmit, onClose, loading,
}: {
  title: string; form: BinForm;
  setForm: React.Dispatch<React.SetStateAction<BinForm>>;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Bin Code *</label>
              <input className="form-input" required placeholder="e.g. A-01-01" value={form.binCode}
                onChange={(e) => setForm(f => ({ ...f, binCode: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={form.binType}
                onChange={(e) => setForm(f => ({ ...f, binType: e.target.value }))}>
                {BIN_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="form-label">Section</label>
              <input className="form-input" value={form.section}
                onChange={(e) => setForm(f => ({ ...f, section: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Aisle</label>
              <input className="form-input" value={form.aisle}
                onChange={(e) => setForm(f => ({ ...f, aisle: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Shelf</label>
              <input className="form-input" value={form.shelf}
                onChange={(e) => setForm(f => ({ ...f, shelf: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Position</label>
              <input className="form-input" value={form.position}
                onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Capacity</label>
            <input className="form-input" type="number" min={1} value={form.capacity}
              onChange={(e) => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
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

const typeColors: Record<string, string> = {
  STANDARD: 'bg-blue-100 text-blue-700',
  COLD_STORAGE: 'bg-cyan-100 text-cyan-700',
  FRAGILE: 'bg-amber-100 text-amber-700',
  OVERSIZED: 'bg-purple-100 text-purple-700',
};

export default function WarehouseBinsPage() {
  const qc = useQueryClient();
  const [centerId, setCenterId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<BinForm>({ ...BLANK });
  const [sectionFilter, setSectionFilter] = useState('');

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data: binsData, isLoading } = useQuery({
    queryKey: ['warehouse-bins', centerId, sectionFilter],
    queryFn: () => centerId
      ? warehouseApi.getBins(centerId, { limit: 200, section: sectionFilter || undefined }).then(r => r.data)
      : Promise.resolve({ bins: [], total: 0 }),
    enabled: !!centerId,
  });

  const createM = useMutation({
    mutationFn: (d: any) => warehouseApi.createBin(centerId, d),
    onSuccess: () => { toast.success('Bin created'); qc.invalidateQueries({ queryKey: ['warehouse-bins'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => warehouseApi.updateBin(id, d),
    onSuccess: () => { toast.success('Bin updated'); qc.invalidateQueries({ queryKey: ['warehouse-bins'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => warehouseApi.deleteBin(id),
    onSuccess: () => { toast.success('Bin deleted'); qc.invalidateQueries({ queryKey: ['warehouse-bins'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(b: any) {
    setEditing(b);
    setForm({
      binCode: b.binCode || '', section: b.section || '', aisle: b.aisle || '',
      shelf: b.shelf || '', position: b.position || '', capacity: b.capacity ?? 100,
      binType: b.binType || 'STANDARD',
    });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); setForm({ ...BLANK }); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      binCode: form.binCode, section: form.section || undefined, aisle: form.aisle || undefined,
      shelf: form.shelf || undefined, position: form.position || undefined,
      capacity: form.capacity, binType: form.binType,
    };
    if (editing) updateM.mutate({ id: editing.id, d: payload });
    else createM.mutate(payload);
  }

  const bins: any[] = binsData?.bins || [];
  const sections = Array.from(new Set(bins.map((b: any) => b.section).filter(Boolean)));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Bins</h1>
          <p className="text-gray-500 mt-1">Manage storage bins within fulfillment centers</p>
        </div>
        {centerId && (
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Bin
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <select className="form-input max-w-xs" value={centerId}
          onChange={(e) => { setCenterId(e.target.value); setSectionFilter(''); }}>
          <option value="">Select Fulfillment Center</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
        {sections.length > 0 && (
          <select className="form-input max-w-[180px]" value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}>
            <option value="">All Sections</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        )}
      </div>

      {showModal && (
        <BinModal title={editing ? 'Edit Bin' : 'Add Bin'} form={form} setForm={setForm}
          onSubmit={handleSubmit} onClose={closeModal} loading={createM.isPending || updateM.isPending} />
      )}

      {!centerId ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a fulfillment center to view bins</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}</div>
        </div>
      ) : bins.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No bins in this center</p>
          <button className="btn-primary" onClick={openCreate}>Add First Bin</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Bin Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Section</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Location</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Occupancy</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bins.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{b.binCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{b.section || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {[b.aisle, b.shelf, b.position].filter(Boolean).join('-') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[b.binType] || 'bg-gray-100 text-gray-600'}`}>
                      {b.binType?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{
                          width: `${b.capacity > 0 ? Math.min(100, Math.round((b.currentOccupancy / b.capacity) * 100)) : 0}%`,
                        }} />
                      </div>
                      <span className="text-xs text-gray-500">{b.currentOccupancy}/{b.capacity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openEdit(b)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                        disabled={deleteM.isPending}
                        onClick={() => { if (confirm(`Delete bin "${b.binCode}"?`)) deleteM.mutate(b.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Total: {binsData?.total || bins.length} bins
          </div>
        </div>
      )}
    </div>
  );
}
