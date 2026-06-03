'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../../lib/api';
import { Warehouse, Pencil, Trash2, Plus, X, BarChart3, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK = {
  name: '', code: '', address: '', city: '', district: '', postalCode: '',
  lat: '', lng: '', phone: '', email: '', capacity: 10000,
  operatingHoursStart: '08:00', operatingHoursEnd: '22:00', isActive: true,
};
type FormType = typeof BLANK;

function Modal({
  title, form, setForm, onSubmit, onClose, loading,
}: {
  title: string; form: FormType;
  setForm: React.Dispatch<React.SetStateAction<FormType>>;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Center Name *</label>
              <input className="form-input" required value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Code *</label>
              <input className="form-input" required placeholder="e.g. FC-SEOUL-01" value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Address *</label>
            <input className="form-input" required value={form.address}
              onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">City *</label>
              <input className="form-input" required value={form.city}
                onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">District</label>
              <input className="form-input" value={form.district}
                onChange={(e) => setForm(f => ({ ...f, district: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Postal Code</label>
              <input className="form-input" value={form.postalCode}
                onChange={(e) => setForm(f => ({ ...f, postalCode: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Latitude</label>
              <input className="form-input" type="number" step="any" value={form.lat}
                onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Longitude</label>
              <input className="form-input" type="number" step="any" value={form.lng}
                onChange={(e) => setForm(f => ({ ...f, lng: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Max Capacity</label>
              <input className="form-input" type="number" min={0} value={form.capacity}
                onChange={(e) => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Operating Start</label>
              <input className="form-input" type="time" value={form.operatingHoursStart}
                onChange={(e) => setForm(f => ({ ...f, operatingHoursStart: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Operating End</label>
              <input className="form-input" type="time" value={form.operatingHoursEnd}
                onChange={(e) => setForm(f => ({ ...f, operatingHoursEnd: e.target.value }))} />
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
            <label className="text-sm font-medium text-gray-700">
              {form.isActive ? 'Active' : 'Inactive'}
            </label>
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

export default function FulfillmentCentersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<FormType>({ ...BLANK });
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fulfillment-centers', search],
    queryFn: () => warehouseApi.getCenters({ search: search || undefined }).then(r => r.data),
  });

  const createM = useMutation({
    mutationFn: (d: any) => warehouseApi.createCenter(d),
    onSuccess: () => { toast.success('Center created'); qc.invalidateQueries({ queryKey: ['fulfillment-centers'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => warehouseApi.updateCenter(id, d),
    onSuccess: () => { toast.success('Center updated'); qc.invalidateQueries({ queryKey: ['fulfillment-centers'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => warehouseApi.deleteCenter(id),
    onSuccess: () => { toast.success('Center deleted'); qc.invalidateQueries({ queryKey: ['fulfillment-centers'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function openCreate() {
    setEditing(null); setForm({ ...BLANK }); setShowModal(true);
  }
  function openEdit(c: any) {
    setEditing(c);
    setForm({
      name: c.name || '', code: c.code || '', address: c.address || '', city: c.city || '',
      district: c.district || '', postalCode: c.postalCode || '',
      lat: c.lat != null ? String(c.lat) : '', lng: c.lng != null ? String(c.lng) : '',
      phone: c.phone || '', email: c.email || '', capacity: c.capacity ?? 10000,
      operatingHoursStart: c.operatingHoursStart || '08:00',
      operatingHoursEnd: c.operatingHoursEnd || '22:00', isActive: c.isActive ?? true,
    });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); setForm({ ...BLANK }); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      name: form.name, code: form.code, address: form.address, city: form.city,
      district: form.district || undefined, postalCode: form.postalCode || undefined,
      lat: form.lat ? Number(form.lat) : undefined, lng: form.lng ? Number(form.lng) : undefined,
      phone: form.phone || undefined, email: form.email || undefined,
      capacity: form.capacity, operatingHoursStart: form.operatingHoursStart || undefined,
      operatingHoursEnd: form.operatingHoursEnd || undefined, isActive: form.isActive,
    };
    if (editing) updateM.mutate({ id: editing.id, d: payload });
    else createM.mutate(payload);
  }

  const centers: any[] = data?.centers || [];
  const isSaving = createM.isPending || updateM.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fulfillment Centers</h1>
          <p className="text-gray-500 mt-1">Manage warehouse & fulfillment locations</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Center
        </button>
      </div>

      <div className="mb-4">
        <input className="form-input max-w-sm" placeholder="Search by name, code, or city..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Center' : 'Add Center'}
          form={form} setForm={setForm} onSubmit={handleSubmit} onClose={closeModal} loading={isSaving} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : centers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-16 text-gray-400">
            <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">No fulfillment centers yet</p>
            <button className="btn-primary" onClick={openCreate}>Add First Center</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{c.name}</h3>
                    <span className="text-xs text-gray-500 font-mono">{c.code}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" /> {c.city}{c.district ? `, ${c.district}` : ''}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{c._count?.bins || 0}</div>
                  <div className="text-xs text-gray-500">Bins</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{c._count?.packages || 0}</div>
                  <div className="text-xs text-gray-500">Packages</div>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{
                  width: `${c.capacity > 0 ? Math.min(100, Math.round((c.currentOccupancy / c.capacity) * 100)) : 0}%`,
                }} />
              </div>
              <div className="text-xs text-gray-400 text-right">
                {c.currentOccupancy?.toLocaleString()} / {c.capacity?.toLocaleString()} capacity
              </div>

              <div className="flex gap-2 pt-1 border-t border-gray-50">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold"
                  onClick={() => openEdit(c)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold disabled:opacity-50"
                  disabled={deleteM.isPending}
                  onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteM.mutate(c.id); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
