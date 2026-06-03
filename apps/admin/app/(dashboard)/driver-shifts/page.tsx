'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, warehouseApi } from '../../../lib/api';
import { CalendarDays, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BLANK = { name: '', startTime: '09:00', endTime: '17:00', maxDrivers: 10, daysOfWeek: [1, 2, 3, 4, 5], fulfillmentCenterId: '' };
type ShiftForm = typeof BLANK;

function ShiftModal({
  title, form, setForm, centers, onSubmit, onClose, loading,
}: {
  title: string; form: ShiftForm;
  setForm: React.Dispatch<React.SetStateAction<ShiftForm>>;
  centers: any[];
  onSubmit: (e: React.FormEvent) => void; onClose: () => void; loading: boolean;
}) {
  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day].sort(),
    }));
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="form-label">Shift Name *</label>
            <input className="form-input" required value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Shift" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="time" required value={form.startTime}
                onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">End Time *</label>
              <input className="form-input" type="time" required value={form.endTime}
                onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Max Drivers</label>
            <input className="form-input" type="number" min={1} value={form.maxDrivers}
              onChange={(e) => setForm(f => ({ ...f, maxDrivers: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="form-label">Fulfillment Center</label>
            <select className="form-input" value={form.fulfillmentCenterId}
              onChange={(e) => setForm(f => ({ ...f, fulfillmentCenterId: e.target.value }))}>
              <option value="">All Centers</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Days of Week</label>
            <div className="flex gap-2 mt-1">
              {DAYS.map((d, i) => (
                <button key={i} type="button"
                  className={`w-10 h-10 rounded-full text-xs font-semibold transition-colors ${
                    form.daysOfWeek.includes(i) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleDay(i)}>
                  {d}
                </button>
              ))}
            </div>
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

export default function DriverShiftsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<ShiftForm>({ ...BLANK });
  const [centerFilter, setCenterFilter] = useState('');

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data, isLoading } = useQuery({
    queryKey: ['driver-shifts', centerFilter],
    queryFn: () => routesApi.getShifts(centerFilter || undefined).then(r => r.data),
  });

  const createM = useMutation({
    mutationFn: (d: any) => routesApi.createShift(d),
    onSuccess: () => { toast.success('Shift created'); qc.invalidateQueries({ queryKey: ['driver-shifts'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => routesApi.updateShift(id, d),
    onSuccess: () => { toast.success('Shift updated'); qc.invalidateQueries({ queryKey: ['driver-shifts'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => routesApi.deleteShift(id),
    onSuccess: () => { toast.success('Shift deleted'); qc.invalidateQueries({ queryKey: ['driver-shifts'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(s: any) {
    setEditing(s);
    setForm({
      name: s.name, startTime: s.startTime, endTime: s.endTime,
      maxDrivers: s.maxDrivers ?? 10, daysOfWeek: s.daysOfWeek || [1, 2, 3, 4, 5],
      fulfillmentCenterId: s.fulfillmentCenterId || '',
    });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { ...form, fulfillmentCenterId: form.fulfillmentCenterId || undefined };
    if (editing) updateM.mutate({ id: editing.id, d: payload });
    else createM.mutate(payload);
  }

  const shifts: any[] = data?.shifts || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Shifts</h1>
          <p className="text-gray-500 mt-1">Manage work shifts for delivery drivers</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Shift
        </button>
      </div>

      <div className="mb-4">
        <select className="form-input max-w-xs" value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {showModal && (
        <ShiftModal title={editing ? 'Edit Shift' : 'Add Shift'} form={form} setForm={setForm}
          centers={centers} onSubmit={handleSubmit} onClose={closeModal}
          loading={createM.isPending || updateM.isPending} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No shifts configured</p>
          <button className="btn-primary" onClick={openCreate}>Add First Shift</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((s: any) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-sm text-gray-500">{s.startTime} — {s.endTime}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                  s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-1">
                {DAYS.map((d, i) => (
                  <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    (s.daysOfWeek || []).includes(i) ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-300'
                  }`}>{d[0]}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Max: {s.maxDrivers} drivers</span>
                <span>{s._count?.assignments || 0} assignments</span>
              </div>
              {s.fulfillmentCenter && (
                <p className="text-xs text-gray-400">{s.fulfillmentCenter.name}</p>
              )}
              <div className="flex gap-2 pt-1 border-t border-gray-50">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold"
                  onClick={() => openEdit(s)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold"
                  disabled={deleteM.isPending}
                  onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteM.mutate(s.id); }}>
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
