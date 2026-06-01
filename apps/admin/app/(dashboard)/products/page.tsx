'use client';

import { useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi, uploadApi, adminApi } from '../../../lib/api';
import api from '../../../lib/api';
import {
  Package, Pencil, Trash2, X, Eye, EyeOff, Info,
  Upload, Plus, GripVertical, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

interface ImageItem { url: string; uploading?: boolean }

interface EditForm {
  id?: string;
  name: string;
  nameKr: string;
  description: string;
  price: string;
  discountPrice: string;
  stock: string;
  unit: string;
  categoryId: string;
  isFeatured: boolean;
  isDeliveryAvailable: boolean;
  deliveryFee: string;
  minOrderQty: string;
  maxOrderQty: string;
  tags: string;          // comma-separated in UI
  images: ImageItem[];   // ordered list
}

const BLANK: EditForm = {
  name: '', nameKr: '', description: '',
  price: '', discountPrice: '', stock: '',
  unit: 'pcs', categoryId: '',
  isFeatured: false,
  isDeliveryAvailable: true,
  deliveryFee: '',
  minOrderQty: '', maxOrderQty: '',
  tags: '',
  images: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flattenCats(list: any[], depth = 0): any[] {
  return list.flatMap((c) => [
    { ...c, _depth: depth },
    ...(c.children ? flattenCats(c.children, depth + 1) : []),
  ]);
}

function productToForm(p: any): EditForm {
  return {
    id: p.id,
    name: p.name || '',
    nameKr: p.nameKr || '',
    description: p.description || '',
    price: String(p.price ?? ''),
    discountPrice: p.discountPrice ? String(p.discountPrice) : '',
    stock: String(p.stock ?? ''),
    unit: p.unit || 'pcs',
    categoryId: p.category?.id || p.categoryId || '',
    isFeatured: !!p.isFeatured,
    isDeliveryAvailable: p.isDeliveryAvailable !== false,
    deliveryFee: p.deliveryFee != null ? String(p.deliveryFee) : '',
    minOrderQty: p.minOrderQty ? String(p.minOrderQty) : '',
    maxOrderQty: p.maxOrderQty ? String(p.maxOrderQty) : '',
    tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
    images: (p.images || []).map((img: any) => ({ url: img.url })),
  };
}

function formToPayload(f: EditForm) {
  return {
    name:       f.name.trim(),
    nameKr:     f.nameKr.trim() || undefined,
    description: f.description.trim(),
    price:      Number(f.price),
    discountPrice: f.discountPrice ? Number(f.discountPrice) : null,
    stock:      Number(f.stock),
    unit:       f.unit,
    categoryId: f.categoryId,
    isFeatured: f.isFeatured,
    isDeliveryAvailable: f.isDeliveryAvailable,
    deliveryFee: f.deliveryFee ? Number(f.deliveryFee) : undefined,
    minOrderQty: f.minOrderQty ? Number(f.minOrderQty) : undefined,
    maxOrderQty: f.maxOrderQty ? Number(f.maxOrderQty) : undefined,
    tags: f.tags ? f.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    images: f.images.map((img) => img.url),
  };
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ProductStatus }) {
  if (status === 'ACTIVE')  return <span className="badge bg-green-100 text-green-700">Active</span>;
  if (status === 'DELETED') return <span className="badge bg-red-100 text-red-700">Deleted</span>;
  return <span className="badge bg-yellow-100 text-yellow-700">Inactive</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch]               = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editForm, setEditForm]           = useState<EditForm | null>(null);
  const [hideModal, setHideModal]         = useState<{ product: any } | null>(null);
  const [hideReason, setHideReason]       = useState('');
  const [uploadingIdx, setUploadingIdx]   = useState<number | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['products-admin', search, categoryFilter],
    queryFn: () => productsApi.getAll({ search, categoryId: categoryFilter || undefined, page: 1, limit: 100 }).then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
  });

  // Dynamic app name for seller fallback
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const appName = useMemo(() => {
    const s = settingsData?.settings as any[] | undefined;
    return s?.find((x: any) => x.key === 'APP_NAME')?.value || 'Store';
  }, [settingsData]);

  // Backend returns a plain array of categories (each with .children[])
  const rawCats: any[] = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.categories || []);
  const flatCats = flattenCats(rawCats);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      toast.success('Product updated');
      qc.invalidateQueries({ queryKey: ['products-admin'] });
      setEditForm(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['products-admin'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visible, reason }: { id: string; visible: boolean; reason?: string }) =>
      api.put(`/products/${id}/admin-visibility`, { visible, reason }),
    onSuccess: (_, vars) => {
      toast.success(vars.visible ? 'Product is now visible' : 'Product hidden');
      qc.invalidateQueries({ queryKey: ['products-admin'] });
      setHideModal(null);
      setHideReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Action failed'),
  });

  // ── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editForm) return;
    if (editForm.images.length + files.length > 8) {
      toast.error('Maximum 8 images per product'); return;
    }

    // Add placeholders
    const placeholderCount = files.length;
    const startIdx = editForm.images.length;
    setEditForm((f) => f ? ({
      ...f,
      images: [...f.images, ...files.map(() => ({ url: '', uploading: true }))],
    }) : f);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const idx = startIdx + i;
      setUploadingIdx(idx);
      try {
        const res = await uploadApi.uploadImage(file, 'products');
        const url: string = res.data.url;
        setEditForm((f) => {
          if (!f) return f;
          const imgs = [...f.images];
          imgs[idx] = { url, uploading: false };
          return { ...f, images: imgs };
        });
      } catch {
        toast.error(`Failed to upload image ${i + 1}`);
        setEditForm((f) => {
          if (!f) return f;
          const imgs = f.images.filter((_, j) => j !== idx);
          return { ...f, images: imgs };
        });
      }
    }
    setUploadingIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setEditForm((f) => f ? ({ ...f, images: f.images.filter((_, i) => i !== idx) }) : f);
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setEditForm((f) => {
      if (!f) return f;
      const imgs = [...f.images];
      const target = idx + dir;
      if (target < 0 || target >= imgs.length) return f;
      [imgs[idx], imgs[target]] = [imgs[target], imgs[idx]];
      return { ...f, images: imgs };
    });
  };

  const products = data?.products || [];

  // ── Submit edit ────────────────────────────────────────────────────────────
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm?.id) return;
    if (editForm.images.some((img) => img.uploading)) {
      toast.error('Please wait for images to finish uploading'); return;
    }
    updateMutation.mutate({ id: editForm.id, data: formToPayload(editForm) });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Manage all marketplace products</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Total: {data?.total || 0}</span>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <Info className="w-4 h-4 flex-shrink-0" />
            Products are added by sellers. Admin can moderate below.
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="text" className="form-input w-56" placeholder="Search products..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Filter by category" className="form-input w-52"
          value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {flatCats.map((c) => (
            <option key={c.id} value={c.id}>{'  '.repeat(c._depth)}{c._depth > 0 ? '└ ' : ''}{c.name}</option>
          ))}
        </select>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8">
            {/* Modal header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Edit Product</h2>
              <button type="button" aria-label="Close" onClick={() => setEditForm(null)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* ── Images ── */}
              <div>
                <label className="form-label flex items-center gap-1">
                  Product Images
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    (drag arrows to reorder · first image = main · max 8)
                  </span>
                </label>

                {/* Image grid */}
                {editForm.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {editForm.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <div className="aspect-square rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                          {img.uploading ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <img src={img.url} alt={`img-${idx}`} className="w-full h-full object-cover" />
                          )}
                          {/* Main image badge */}
                          {idx === 0 && !img.uploading && (
                            <span className="absolute top-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md font-semibold">
                              Main
                            </span>
                          )}
                        </div>
                        {/* Controls overlay */}
                        {!img.uploading && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1">
                            {idx > 0 && (
                              <button type="button" aria-label="Move left"
                                className="p-1 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                                onClick={() => moveImage(idx, -1)}>
                                <GripVertical className="w-3 h-3 rotate-90" />
                              </button>
                            )}
                            {idx < editForm.images.length - 1 && (
                              <button type="button" aria-label="Move right"
                                className="p-1 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                                onClick={() => moveImage(idx, 1)}>
                                <GripVertical className="w-3 h-3 -rotate-90" />
                              </button>
                            )}
                            <button type="button" aria-label="Remove image"
                              className="p-1 bg-red-500 rounded-lg text-white hover:bg-red-600"
                              onClick={() => removeImage(idx)}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                {editForm.images.length < 8 && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      aria-label="Upload product images"
                      onChange={handleImageUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingIdx !== null}
                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors w-full justify-center disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingIdx !== null ? 'Uploading...' : 'Upload Images (JPG, PNG — up to 5 MB each)'}
                    </button>
                  </>
                )}
              </div>

              {/* ── Names ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="pname">Product Name *</label>
                  <input id="pname" className="form-input" required
                    placeholder="e.g. Fuji Apples 1kg"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, name: e.target.value }) : f)} />
                </div>
                <div>
                  <label className="form-label" htmlFor="pnamekr">Korean Name (선택)</label>
                  <input id="pnamekr" className="form-input"
                    placeholder="e.g. 후지 사과 1kg"
                    value={editForm.nameKr}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, nameKr: e.target.value }) : f)} />
                </div>
              </div>

              {/* ── Description ── */}
              <div>
                <label className="form-label" htmlFor="pdesc">Description</label>
                <textarea id="pdesc" className="form-input" rows={3}
                  placeholder="Short product description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => f ? ({ ...f, description: e.target.value }) : f)} />
              </div>

              {/* ── Category ── */}
              <div>
                <label className="form-label">Category *</label>
                <select aria-label="Category" className="form-input"
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm((f) => f ? ({ ...f, categoryId: e.target.value }) : f)}
                  required>
                  <option value="">Select category...</option>
                  {flatCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {'  '.repeat(c._depth)}{c._depth > 0 ? '└ ' : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Pricing ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="pprice">Price (₩) *</label>
                  <input id="pprice" type="number" min="0" className="form-input" required
                    placeholder="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, price: e.target.value }) : f)} />
                </div>
                <div>
                  <label className="form-label" htmlFor="pdiscount">Sale Price (₩)</label>
                  <input id="pdiscount" type="number" min="0" className="form-input"
                    placeholder="Leave blank if no sale"
                    value={editForm.discountPrice}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, discountPrice: e.target.value }) : f)} />
                </div>
              </div>

              {/* ── Stock + Unit ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="pstock">Stock *</label>
                  <input id="pstock" type="number" min="0" className="form-input" required
                    placeholder="0"
                    value={editForm.stock}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, stock: e.target.value }) : f)} />
                </div>
                <div>
                  <label className="form-label" htmlFor="punit">Unit</label>
                  <select id="punit" aria-label="Unit" className="form-input"
                    value={editForm.unit}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, unit: e.target.value }) : f)}>
                    {['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box', 'bundle', 'bag', 'bottle', 'loaf', 'dozen'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Order qty limits ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="pminqty">Min Order Qty</label>
                  <input id="pminqty" type="number" min="1" className="form-input"
                    placeholder="1 (default)"
                    value={editForm.minOrderQty}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, minOrderQty: e.target.value }) : f)} />
                </div>
                <div>
                  <label className="form-label" htmlFor="pmaxqty">Max Order Qty</label>
                  <input id="pmaxqty" type="number" min="1" className="form-input"
                    placeholder="No limit (default)"
                    value={editForm.maxOrderQty}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, maxOrderQty: e.target.value }) : f)} />
                </div>
              </div>

              {/* ── Delivery ── */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="pdelivery" className="w-4 h-4 accent-primary"
                    checked={editForm.isDeliveryAvailable}
                    onChange={(e) => setEditForm((f) => f ? ({ ...f, isDeliveryAvailable: e.target.checked }) : f)} />
                  <label htmlFor="pdelivery" className="text-sm font-semibold text-gray-700">
                    Delivery Available
                  </label>
                </div>
                {editForm.isDeliveryAvailable && (
                  <div>
                    <label className="form-label" htmlFor="pdeliveryfee">Delivery Fee (₩)</label>
                    <input id="pdeliveryfee" type="number" min="0" className="form-input"
                      placeholder="0 for free delivery"
                      value={editForm.deliveryFee}
                      onChange={(e) => setEditForm((f) => f ? ({ ...f, deliveryFee: e.target.value }) : f)} />
                    <p className="text-xs text-gray-400 mt-1">Leave 0 for free delivery</p>
                  </div>
                )}
              </div>

              {/* ── Tags ── */}
              <div>
                <label className="form-label flex items-center gap-1.5" htmlFor="ptags">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Tags
                  <span className="text-xs text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <input id="ptags" className="form-input"
                  placeholder="e.g. organic, fresh, imported, sale"
                  value={editForm.tags}
                  onChange={(e) => setEditForm((f) => f ? ({ ...f, tags: e.target.value }) : f)} />
                {/* Tag preview */}
                {editForm.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editForm.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Featured ── */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="pfeatured" className="w-4 h-4 accent-primary"
                  checked={editForm.isFeatured}
                  onChange={(e) => setEditForm((f) => f ? ({ ...f, isFeatured: e.target.checked }) : f)} />
                <label htmlFor="pfeatured" className="text-sm font-semibold text-gray-700">
                  Mark as Featured
                  <span className="text-xs text-gray-400 font-normal ml-1">(shows in featured section on home screen)</span>
                </label>
              </div>

              {/* ── Actions ── */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" className="btn-secondary flex-1" onClick={() => setEditForm(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={updateMutation.isPending || uploadingIdx !== null}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Hide Modal ─────────────────────────────────────────────────────── */}
      {hideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Hide Product</h2>
              <button type="button" aria-label="Close"
                onClick={() => { setHideModal(null); setHideReason(''); }}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              You are about to hide:{' '}
              <span className="font-semibold text-gray-900">{hideModal.product.name}</span>
            </p>
            <div className="mb-4">
              <label className="form-label" htmlFor="hide-reason">Reason for hiding *</label>
              <textarea
                id="hide-reason"
                className="form-input mt-1"
                rows={3}
                placeholder="Reason for hiding this product..."
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1"
                onClick={() => { setHideModal(null); setHideReason(''); }}>
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                disabled={!hideReason.trim() || visibilityMutation.isPending}
                onClick={() => visibilityMutation.mutate({ id: hideModal.product.id, visible: false, reason: hideReason })}
              >
                {visibilityMutation.isPending ? 'Hiding...' : 'Confirm Hide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Products table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Product', 'Category', 'Seller', 'Price', 'Stock', 'Status', 'Featured', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p: any) => {
                  const status: ProductStatus = p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE');
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.images?.[0] ? (
                              <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{p.name}</div>
                            {p.nameKr && <div className="text-xs text-gray-400">{p.nameKr}</div>}
                            {p.discountPrice && (
                              <div className="text-xs text-green-600">Sale: ₩{p.discountPrice?.toLocaleString()}</div>
                            )}
                            {/* Tags */}
                            {Array.isArray(p.tags) && p.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {p.tags.slice(0, 3).map((tag: string, i: number) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                    #{tag}
                                  </span>
                                ))}
                                {p.tags.length > 3 && (
                                  <span className="text-[10px] text-gray-400">+{p.tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-sm text-gray-500">{p.category?.name || '—'}</td>
                      <td className="table-td text-sm">{p.seller?.storeName || appName}</td>
                      <td className="table-td">
                        <div className="font-bold text-sm">₩{p.price?.toLocaleString()}</div>
                        {p.discountPrice && (
                          <div className="text-xs text-gray-400 line-through">₩{p.price?.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="table-td">
                        <span className={`font-medium text-sm ${p.stock < 10 ? 'text-red-500' : 'text-gray-800'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="table-td"><StatusBadge status={status} /></td>
                      <td className="table-td">
                        {p.isFeatured
                          ? <span className="badge bg-amber-100 text-amber-700">Featured</span>
                          : '—'}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          {/* Edit */}
                          <button type="button" aria-label="Edit product"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            onClick={() => setEditForm(productToForm(p))}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* Hide */}
                          {status === 'ACTIVE' && (
                            <button type="button" aria-label="Hide product"
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => { setHideModal({ product: p }); setHideReason(''); }}>
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}
                          {/* Show */}
                          {status === 'INACTIVE' && (
                            <button type="button" aria-label="Show product"
                              className="p-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50"
                              onClick={() => visibilityMutation.mutate({ id: p.id, visible: true })}>
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {/* Delete */}
                          <button type="button" aria-label="Delete product"
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
