'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannersApi } from '../../../lib/api';
import { Image, Plus, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = { title: '', subtitle: '', imageUrl: '', linkUrl: '', linkType: 'NONE', position: 1, isActive: true };

export default function BannersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => bannersApi.getAll().then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => editingId ? bannersApi.update(editingId, form) : bannersApi.create(form),
    onSuccess: () => {
      toast.success(editingId ? 'Banner updated' : 'Banner created');
      qc.invalidateQueries({ queryKey: ['banners'] });
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannersApi.delete(id),
    onSuccess: () => { toast.success('Banner deleted'); qc.invalidateQueries({ queryKey: ['banners'] }); },
  });

  const banners = data?.banners || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-gray-500 mt-1">Manage home screen promotional banners</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(true); setForm(EMPTY); setEditingId(null); }}>
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {/* Banner Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Banner' : 'Add Banner'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Title</label>
                <input className="form-input mt-1" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Subtitle</label>
                <input className="form-input mt-1" value={form.subtitle} onChange={(e) => setForm((f: any) => ({ ...f, subtitle: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Image URL</label>
                <input className="form-input mt-1" placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm((f: any) => ({ ...f, imageUrl: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Link Type</label>
                  <select className="form-input mt-1" value={form.linkType} onChange={(e) => setForm((f: any) => ({ ...f, linkType: e.target.value }))}>
                    <option value="NONE">None</option>
                    <option value="CATEGORY">Category</option>
                    <option value="PRODUCT">Product</option>
                    <option value="URL">External URL</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Position</label>
                  <input type="number" className="form-input mt-1" value={form.position} onChange={(e) => setForm((f: any) => ({ ...f, position: Number(e.target.value) }))} />
                </div>
              </div>
              {form.linkType !== 'NONE' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Link Value</label>
                  <input className="form-input mt-1" placeholder="Category ID / Product ID / URL" value={form.linkUrl} onChange={(e) => setForm((f: any) => ({ ...f, linkUrl: e.target.value }))} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="banner-active" checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <label htmlFor="banner-active" className="text-sm font-semibold text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => saveMutation.mutate()}>
                {editingId ? 'Update' : 'Create'} Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No banners yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b: any) => (
            <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {b.imageUrl ? (
                <div className="h-36 bg-gray-100 relative">
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-2 left-3 text-white">
                    <p className="font-bold text-sm">{b.title}</p>
                    {b.subtitle && <p className="text-xs opacity-80">{b.subtitle}</p>}
                  </div>
                </div>
              ) : (
                <div className="h-36 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <Image className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                    <p className="font-bold text-sm text-gray-600">{b.title}</p>
                  </div>
                </div>
              )}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`badge text-xs ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
                  <span className="text-xs text-gray-400">Position #{b.position}</span>
                </div>
                <div className="flex gap-2">
                  <button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => { setEditingId(b.id); setForm(b); setShowForm(true); }}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={() => { if (confirm('Delete banner?')) deleteMutation.mutate(b.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
