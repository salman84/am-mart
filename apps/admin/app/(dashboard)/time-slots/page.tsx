'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi } from '../../../lib/api';
import { Clock, Plus, Pencil, Trash2, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BLANK = { name: '', startTime: '09:00', endTime: '12:00', maxOrders: 50, surcharge: 0, isExpress: false, cutoffHours: 2, daysOfWeek: [1, 2, 3, 4, 5, 6] };
type Form = typeof BLANK;

function Modal({
  title, form, setForm, onSubmit, onClose, loading,
}: {
  title: string; form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>;
  onSubmit: (e: React.FormEvent) => void; onClose: () => void; loading: boolean;
}) {
  const toggleDay = (d: number) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter(x => x !== d) : [...f.daysOfWeek, d].sort(),
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
            <label className="form-label">Slot Name *</label>
            <input className="form-input" required value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning" />
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Max Orders</label>
              <input className="form-input" type="number" min={1} value={form.maxOrders}
                onChange={(e) => setForm(f => ({ ...f, maxOrders: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Surcharge</label>
              <input className="form-input" type="number" min={0} step="100" value={form.surcharge}
                onChange={(e) => setForm(f => ({ ...f, surcharge: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label">Cutoff (hrs)</label>
              <input className="form-input" type="number" min={0} value={form.cutoffHours}
                onChange={(e) => setForm(f => ({ ...f, cutoffHours: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isExpress: !f.isExpress }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isExpress ? 'bg-amber-500' : 'bg-gray-300'
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isExpress ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <label className="text-sm font-medium text-gray-700">Express Delivery</label>
          </div>
          <div>
            <label className="form-label">Available Days</label>
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

export default function TimeSlotsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Form>({ ...BLANK });

  const { data, isLoading } = useQuery({
    queryKey: ['time-slots'],
    queryFn: () => routesApi.getTimeSlots().then(r => r.data),
  });

  const createM = useMutation({
    mutationFn: (d: any) => routesApi.createTimeSlot(d),
    onSuccess: () => { toast.success('Slot created'); qc.invalidateQueries({ queryKey: ['time-slots'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => routesApi.updateTimeSlot(id, d),
    onSuccess: () => { toast.success('Slot updated'); qc.invalidateQueries({ queryKey: ['time-slots'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => routesApi.deleteTimeSlot(id),
    onSuccess: () => { toast.success('Slot deleted'); qc.invalidateQueries({ queryKey: ['time-slots'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(s: any) {
    setEditing(s);
    setForm({
      name: s.name, startTime: s.startTime, endTime: s.endTime,
      maxOrders: s.maxOrders ?? 50, surcharge: s.surcharge ?? 0,
      isExpress: !!s.isExpress, cutoffHours: s.cutoffHours ?? 2,
      daysOfWeek: s.daysOfWeek || [1, 2, 3, 4, 5, 6],
    });
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); setEditing(null); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) updateM.mutate({ id: editing.id, d: form });
    else createM.mutate(form);
  }

  const slots: any[] = data?.slots || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Time Slots</h1>
          <p className="text-gray-500 mt-1">Configure available delivery windows for customers</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Slot
        </button>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Slot' : 'Add Slot'} form={form} setForm={setForm}
          onSubmit={handleSubmit} onClose={closeModal}
          loading={createM.isPending || updateM.isPending} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No time slots configured</p>
          <button className="btn-primary" onClick={openCreate}>Add First Slot</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {slots.map((s: any) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    s.isExpress ? 'bg-amber-100' : 'bg-blue-50'
                  }`}>
                    {s.isExpress ? <Zap className="w-4 h-4 text-amber-600" /> : <Clock className="w-4 h-4 text-blue-600" />}
                  </div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                  s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{s.isActive ? 'Active' : 'Off'}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{s.startTime} — {s.endTime}</div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Load: {s.currentLoad}/{s.maxOrders}</span>
                {s.surcharge > 0 && <span className="text-amber-600">+{s.surcharge?.toLocaleString()}</span>}
              </div>
              <div className="flex gap-1">
                {DAYS.map((d, i) => (
                  <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    (s.daysOfWeek || []).includes(i) ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-300'
                  }`}>{d[0]}</span>
                ))}
              </div>
              <div className="flex gap-2 pt-1 border-t border-gray-50">
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold"
                  onClick={() => openEdit(s)}><Pencil className="w-3 h-3" /> Edit</button>
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold"
                  onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteM.mutate(s.id); }}><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
