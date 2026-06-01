'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannersApi, uploadApi } from '../../../lib/api';
import { Image, Plus, Trash2, Pencil, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = { title: '', subtitle: '', imageUrl: '', linkUrl: '', linkType: 'NONE', sortOrder: 0, isActive: true };

// Pages available for PAGE link type
const APP_PAGES = [
  { value: '/(customer)/', label: 'Home' },
  { value: '/(customer)/products', label: 'Products / Browse' },
  { value: '/(customer)/search', label: 'Search' },
  { value: '/(customer)/cart', label: 'Cart' },
  { value: '/(customer)/orders', label: 'My Orders' },
  { value: '/(customer)/sim', label: 'SIM Cards' },
  { value: '/(customer)/topup', label: 'Top-Up' },
  { value: '/(customer)/profile', label: 'Profile' },
  { value: '/(customer)/notifications', label: 'Notifications' },
];

export default function BannersPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImageUploading(true);
    try {
      const res = await uploadApi.uploadImage(file, 'banners');
      setForm((f: any) => ({ ...f, imageUrl: res.data.url }));
      toast.success('Image uploaded');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const banners = data?.banners || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Main Slider</h1>
          <p className="text-gray-500 mt-1">Manage home screen sliders — add images, set links to products or pages</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(true); setForm(EMPTY); setEditingId(null); }}>
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      {/* Banner Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Slider' : 'Add Slider'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              {/* Image upload */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Slider Image</label>
                {form.imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden h-36 bg-gray-100 mb-2">
                    <img src={form.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((f: any) => ({ ...f, imageUrl: '' }))}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <span className="text-xs font-bold">✕</span>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-28 flex flex-col items-center justify-center gap-1 bg-gray-50 mb-2">
                    <Image className="w-7 h-7 text-gray-300" />
                    <p className="text-xs text-gray-400">No image selected</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" />
                    {imageUploading ? 'Uploading...' : form.imageUrl ? 'Change Image' : 'Upload Image'}
                  </button>
                  <span className="text-xs text-gray-400 self-center">or paste URL below</span>
                </div>
                <input
                  className="form-input mt-2 text-sm"
                  placeholder="https://... (paste image URL)"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f: any) => ({ ...f, imageUrl: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Title</label>
                <input className="form-input mt-1" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Subtitle (optional)</label>
                <input className="form-input mt-1" value={form.subtitle || ''} onChange={(e) => setForm((f: any) => ({ ...f, subtitle: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Link Type</label>
                  <select
                    className="form-input mt-1"
                    value={form.linkType}
                    onChange={(e) => setForm((f: any) => ({ ...f, linkType: e.target.value, linkUrl: '' }))}
                  >
                    <option value="NONE">No Link</option>
                    <option value="PAGE">App Page</option>
                    <option value="PRODUCT">Specific Product</option>
                    <option value="CATEGORY">Category</option>
                    <option value="SIM">SIM Cards</option>
                    <option value="TOPUP">Top-Up</option>
                    <option value="URL">External URL</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Sort Order</label>
                  <input type="number" className="form-input mt-1" value={form.sortOrder} onChange={(e) => setForm((f: any) => ({ ...f, sortOrder: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Link value — changes based on linkType */}
              {form.linkType === 'PAGE' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Select Page</label>
                  <select
                    className="form-input mt-1"
                    value={form.linkUrl}
                    onChange={(e) => setForm((f: any) => ({ ...f, linkUrl: e.target.value }))}
                  >
                    <option value="">— choose page —</option>
                    {APP_PAGES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.linkType === 'PRODUCT' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Product ID</label>
                  <input className="form-input mt-1" placeholder="Paste product ID" value={form.linkUrl} onChange={(e) => setForm((f: any) => ({ ...f, linkUrl: e.target.value }))} />
                </div>
              )}
              {form.linkType === 'CATEGORY' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Category ID</label>
                  <input className="form-input mt-1" placeholder="Paste category ID" value={form.linkUrl} onChange={(e) => setForm((f: any) => ({ ...f, linkUrl: e.target.value }))} />
                </div>
              )}
              {form.linkType === 'URL' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">External URL</label>
                  <input className="form-input mt-1" placeholder="https://..." value={form.linkUrl} onChange={(e) => setForm((f: any) => ({ ...f, linkUrl: e.target.value }))} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="banner-active" checked={form.isActive} onChange={(e) => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <label htmlFor="banner-active" className="text-sm font-semibold text-gray-700">Active (visible in app)</label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Slider' : 'Add Slider'}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge text-xs ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
                  {b.linkType && b.linkType !== 'NONE' && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {b.linkType === 'PAGE' ? `→ ${APP_PAGES.find(p => p.value === b.linkUrl)?.label || b.linkUrl}` : `→ ${b.linkType}`}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">#{b.sortOrder}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                    onClick={() => { setEditingId(b.id); setForm({ ...b, linkUrl: b.linkUrl || '' }); setShowForm(true); }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={() => { if (confirm('Delete slider?')) deleteMutation.mutate(b.id); }}>
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
