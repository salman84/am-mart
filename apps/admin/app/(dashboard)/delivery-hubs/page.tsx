'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubsApi, warehouseApi } from '../../../lib/api';
import { Building2, Pencil, Trash2, Plus, X, MapPin, Users, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK = {
  name: '', code: '', country: 'KR', address: '', city: '', district: '', postalCode: '',
  lat: '', lng: '', phone: '', managerUserId: '', fulfillmentCenterId: '',
  capacity: 500, maxDrivers: 20, operatingHoursStart: '07:00', operatingHoursEnd: '22:00', isActive: true,
};
type Form = typeof BLANK;

function Modal({
  title, form, setForm, centers, onSubmit, onClose, loading,
}: {
  title: string; form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>;
  centers: any[]; onSubmit: (e: React.FormEvent) => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Hub Name *</label>
              <input className="form-input" required value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Code *</label>
              <input className="form-input" required placeholder="HUB-GANGNAM-01" value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Parent Fulfillment Center</label>
            <select className="form-input" value={form.fulfillmentCenterId}
              onChange={(e) => setForm(f => ({ ...f, fulfillmentCenterId: e.target.value }))}>
              <option value="">— None —</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
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
              <label className="form-label">Country</label>
              <input className="form-input" value={form.country}
                onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Capacity</label>
              <input className="form-input" type="number" min={1} value={form.capacity}
                onChange={(e) => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Max Drivers</label>
              <input className="form-input" type="number" min={1} value={form.maxDrivers}
                onChange={(e) => setForm(f => ({ ...f, maxDrivers: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
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

export default function DeliveryHubsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Form>({ ...BLANK });
  const [search, setSearch] = useState('');

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-hubs', search],
    queryFn: () => hubsApi.getAll({ search: search || undefined }).then(r => r.data),
  });

  const createM = useMutation({
    mutationFn: (d: any) => hubsApi.create(d),
    onSuccess: () => { toast.success('Hub created'); qc.invalidateQueries({ queryKey: ['delivery-hubs'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => hubsApi.update(id, d),
    onSuccess: () => { toast.success('Hub updated'); qc.invalidateQueries({ queryKey: ['delivery-hubs'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => hubsApi.remove(id),
    onSuccess: () => { toast.success('Hub deleted'); qc.invalidateQueries({ queryKey: ['delivery-hubs'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(h: any) {
    setEditing(h);
    setForm({
      name: h.name || '', code: h.code || '', country: h.country || 'KR',
      address: h.address || '', city: h.city || '', district: h.district || '',
      postalCode: h.postalCode || '', lat: h.lat != null ? String(h.lat) : '',
      lng: h.lng != null ? String(h.lng) : '', phone: h.phone || '',
      managerUserId: h.managerUserId || '',
      fulfillmentCenterId: h.fulfillmentCenterId || '',
      capacity: h.capacity ?? 500, maxDrivers: h.maxDrivers ?? 20,
      operatingHoursStart: h.operatingHoursStart || '07:00',
      operatingHoursEnd: h.operatingHoursEnd || '22:00',
      isActive: h.isActive ?? true,
    });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      ...form,
      lat: form.lat ? Number(form.lat) : undefined,
      lng: form.lng ? Number(form.lng) : undefined,
      fulfillmentCenterId: form.fulfillmentCenterId || undefined,
      managerUserId: form.managerUserId || undefined,
      district: form.district || undefined,
      postalCode: form.postalCode || undefined,
      phone: form.phone || undefined,
    };
    if (editing) updateM.mutate({ id: editing.id, d: payload });
    else createM.mutate(payload);
  }

  const hubs: any[] = data?.hubs || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Hubs</h1>
          <p className="text-gray-500 mt-1">Intermediate distribution points between warehouses and drivers</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Hub
        </button>
      </div>

      <div className="mb-4">
        <input className="form-input max-w-sm" placeholder="Search by name, code, or city..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Hub' : 'Add Hub'} form={form} setForm={setForm}
          centers={centers} onSubmit={handleSubmit} onClose={closeModal}
          loading={createM.isPending || updateM.isPending} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : hubs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No delivery hubs yet</p>
          <button className="btn-primary" onClick={openCreate}>Add First Hub</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hubs.map((h: any) => (
            <div key={h.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{h.name}</h3>
                    <span className="text-xs text-gray-500 font-mono">{h.code}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${h.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {h.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" /> {h.city}{h.district ? `, ${h.district}` : ''}
              </div>

              {h.fulfillmentCenter && (
                <div className="text-xs text-gray-400">
                  Parent: {h.fulfillmentCenter.name}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{h.currentLoad || 0}</div>
                  <div className="text-xs text-gray-500">Packages</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{h.activeDrivers || 0}/{h.maxDrivers}</div>
                  <div className="text-xs text-gray-500">Drivers</div>
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t border-gray-50">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold"
                  onClick={() => openEdit(h)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold"
                  disabled={deleteM.isPending}
                  onClick={() => { if (confirm(`Delete "${h.name}"?`)) deleteM.mutate(h.id); }}>
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
