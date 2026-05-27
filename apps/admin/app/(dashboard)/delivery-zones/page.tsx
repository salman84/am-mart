'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryZonesApi } from '../../../lib/api';
import { MapPin, Pencil, Trash2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK_ZONE = {
  name: '',
  description: '',
  deliveryFee: 3000,
  isActive: true,
  polygon: '',
};

type ZoneForm = typeof BLANK_ZONE;

function ZoneModal({
  title,
  form,
  setForm,
  onSubmit,
  onClose,
  loading,
}: {
  title: string;
  form: ZoneForm;
  setForm: React.Dispatch<React.SetStateAction<ZoneForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="zone-name">Zone Name *</label>
            <input
              id="zone-name"
              className="form-input"
              required
              placeholder="e.g. Downtown Nairobi"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="zone-desc">Description</label>
            <input
              id="zone-desc"
              className="form-input"
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="zone-fee">Delivery Fee (KES) *</label>
            <input
              id="zone-fee"
              type="number"
              min="0"
              className="form-input"
              required
              placeholder="3000"
              value={form.deliveryFee}
              onChange={(e) => setForm((f) => ({ ...f, deliveryFee: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="zone-polygon">
              Zone Polygon (JSON)
            </label>
            <textarea
              id="zone-polygon"
              className="form-input font-mono text-xs"
              rows={4}
              placeholder={`{"type":"Polygon","coordinates":[[...]]}`}
              value={form.polygon}
              onChange={(e) => setForm((f) => ({ ...f, polygon: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Paste a GeoJSON Polygon object. Leave blank to set later.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle active"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm font-medium text-gray-700">
              {form.isActive ? 'Active' : 'Inactive'}
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function parsePolygon(raw: string): any {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export default function DeliveryZonesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [form, setForm] = useState<ZoneForm>({ ...BLANK_ZONE });

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-zones-admin'],
    queryFn: () => deliveryZonesApi.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => deliveryZonesApi.create(data),
    onSuccess: () => {
      toast.success('Zone created');
      qc.invalidateQueries({ queryKey: ['delivery-zones-admin'] });
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create zone'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => deliveryZonesApi.update(id, data),
    onSuccess: () => {
      toast.success('Zone updated');
      qc.invalidateQueries({ queryKey: ['delivery-zones-admin'] });
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update zone'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliveryZonesApi.delete(id),
    onSuccess: () => {
      toast.success('Zone deleted');
      qc.invalidateQueries({ queryKey: ['delivery-zones-admin'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete zone'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      deliveryZonesApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-zones-admin'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update zone'),
  });

  function openCreate() {
    setEditingZone(null);
    setForm({ ...BLANK_ZONE });
    setShowModal(true);
  }

  function openEdit(zone: any) {
    setEditingZone(zone);
    setForm({
      name: zone.name || '',
      description: zone.description || '',
      deliveryFee: zone.deliveryFee ?? 3000,
      isActive: zone.isActive ?? true,
      polygon: zone.polygon ? JSON.stringify(zone.polygon, null, 2) : '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingZone(null);
    setForm({ ...BLANK_ZONE });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      description: form.description || undefined,
      deliveryFee: form.deliveryFee,
      isActive: form.isActive,
    };
    const poly = parsePolygon(form.polygon);
    if (poly) payload.polygon = poly;

    if (editingZone) {
      updateMutation.mutate({ id: editingZone.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const zones: any[] = data?.zones || data || [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Zones</h1>
          <p className="text-gray-500 mt-1">Manage delivery coverage areas and fees</p>
        </div>
        <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Zone
        </button>
      </div>

      {showModal && (
        <ZoneModal
          title={editingZone ? 'Edit Zone' : 'Add Zone'}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={isSaving}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-16 text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="mb-4">No delivery zones configured yet</p>
            <button type="button" className="btn-primary" onClick={openCreate}>
              Add First Zone
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone: any) => (
            <div
              key={zone.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{zone.name}</h3>
                    {zone.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{zone.description}</p>
                    )}
                  </div>
                </div>
                {/* Active toggle */}
                <button
                  type="button"
                  aria-label={zone.isActive ? 'Deactivate zone' : 'Activate zone'}
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: zone.id, isActive: !zone.isActive })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    zone.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      zone.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400">Delivery Fee</span>
                  <div className="font-bold text-gray-900">
                    KES {zone.deliveryFee?.toLocaleString() ?? '—'}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    zone.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {zone.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex gap-2 pt-1 border-t border-gray-50">
                <button
                  type="button"
                  aria-label="Edit zone"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold"
                  onClick={() => openEdit(zone)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  aria-label="Delete zone"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold disabled:opacity-50"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete zone "${zone.name}"?`)) {
                      deleteMutation.mutate(zone.id);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
