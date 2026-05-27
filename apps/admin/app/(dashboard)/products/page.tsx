'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '../../../lib/api';
import api from '../../../lib/api';
import { Package, Pencil, Trash2, X, Eye, EyeOff, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const BLANK_PRODUCT = {
  name: '', description: '', price: '', discountPrice: '', stock: '',
  unit: 'pcs', categoryId: '', imageUrl: '', isFeatured: false,
};

function flattenCats(list: any[], depth = 0): any[] {
  return list.flatMap((c) => [
    { ...c, _depth: depth },
    ...(c.children ? flattenCats(c.children, depth + 1) : []),
  ]);
}

type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

function StatusBadge({ status }: { status: ProductStatus }) {
  if (status === 'ACTIVE') return <span className="badge bg-green-100 text-green-700">Active</span>;
  if (status === 'DELETED') return <span className="badge bg-red-100 text-red-700">Deleted</span>;
  return <span className="badge bg-yellow-100 text-yellow-700">Inactive</span>;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [hideModal, setHideModal] = useState<{ product: any } | null>(null);
  const [hideReason, setHideReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products-admin', search, categoryFilter],
    queryFn: () => productsApi.getAll({ search, categoryId: categoryFilter || undefined, page: 1, limit: 100 }).then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
  });

  const rawCats: any[] = categoriesData?.categories || [];
  const flatCats = flattenCats(rawCats);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      toast.success('Product updated');
      qc.invalidateQueries({ queryKey: ['products-admin'] });
      setEditingProduct(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
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

  const products = data?.products || [];

  const CategorySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="Category" className="form-input" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Select category...</option>
      {flatCats.map((c) => (
        <option key={c.id} value={c.id}>
          {'  '.repeat(c._depth)}{c._depth > 0 ? '└ ' : ''}{c.name}
        </option>
      ))}
    </select>
  );

  const ProductModal = ({ title, product, setProduct, onSubmit, onClose, loading }: any) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="pname">Product Name *</label>
            <input id="pname" className="form-input" required placeholder="e.g. Fuji Apples 1kg" value={product.name}
              onChange={(e) => setProduct((p: any) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="form-label" htmlFor="pdesc">Description</label>
            <textarea id="pdesc" className="form-input" rows={3} placeholder="Short product description" value={product.description}
              onChange={(e) => setProduct((p: any) => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Category *</label>
            <CategorySelect value={product.categoryId} onChange={(v) => setProduct((p: any) => ({ ...p, categoryId: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="pprice">Price (₩) *</label>
              <input id="pprice" type="number" min="0" className="form-input" required placeholder="0" value={product.price}
                onChange={(e) => setProduct((p: any) => ({ ...p, price: e.target.value }))} />
            </div>
            <div>
              <label className="form-label" htmlFor="pdiscount">Discount Price (₩)</label>
              <input id="pdiscount" type="number" min="0" className="form-input" placeholder="Optional" value={product.discountPrice}
                onChange={(e) => setProduct((p: any) => ({ ...p, discountPrice: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="pstock">Stock *</label>
              <input id="pstock" type="number" min="0" className="form-input" required placeholder="0" value={product.stock}
                onChange={(e) => setProduct((p: any) => ({ ...p, stock: e.target.value }))} />
            </div>
            <div>
              <label className="form-label" htmlFor="punit">Unit</label>
              <select id="punit" aria-label="Unit" className="form-input" value={product.unit}
                onChange={(e) => setProduct((p: any) => ({ ...p, unit: e.target.value }))}>
                {['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box', 'bundle', 'bag', 'bottle', 'loaf', 'dozen'].map(u =>
                  <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Image URL</label>
            <input className="form-input" placeholder="https://..." value={product.imageUrl}
              onChange={(e) => setProduct((p: any) => ({ ...p, imageUrl: e.target.value }))} />
            {product.imageUrl && (
              <img src={product.imageUrl} alt="preview" className="mt-2 h-20 w-20 object-cover rounded-lg border" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="featured" checked={product.isFeatured}
              onChange={(e) => setProduct((p: any) => ({ ...p, isFeatured: e.target.checked }))} className="w-4 h-4" />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">Mark as Featured</label>
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

  return (
    <div>
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

      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="text" className="form-input w-56" placeholder="Search products..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Filter by category" className="form-input w-52" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {flatCats.map((c) => (
            <option key={c.id} value={c.id}>{'  '.repeat(c._depth)}{c._depth > 0 ? '└ ' : ''}{c.name}</option>
          ))}
        </select>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <ProductModal
          title="Edit Product"
          product={editingProduct}
          setProduct={setEditingProduct}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            updateMutation.mutate({
              id: editingProduct.id,
              data: {
                name: editingProduct.name,
                description: editingProduct.description,
                price: Number(editingProduct.price),
                discountPrice: editingProduct.discountPrice ? Number(editingProduct.discountPrice) : null,
                stock: Number(editingProduct.stock),
                unit: editingProduct.unit,
                categoryId: editingProduct.categoryId,
                isFeatured: editingProduct.isFeatured,
              },
            });
          }}
          onClose={() => setEditingProduct(null)}
          loading={updateMutation.isPending}
        />
      )}

      {/* Hide Modal */}
      {hideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Hide Product</h2>
              <button type="button" aria-label="Close" onClick={() => { setHideModal(null); setHideReason(''); }}
                className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              You are about to hide: <span className="font-semibold text-gray-900">{hideModal.product.name}</span>
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
                onClick={() => { setHideModal(null); setHideReason(''); }}>Cancel</button>
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
                            {p.discountPrice && (
                              <div className="text-xs text-green-600">Sale: ₩{p.discountPrice?.toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-sm text-gray-500">{p.category?.name || '—'}</td>
                      <td className="table-td text-sm">{p.seller?.storeName || 'AM Mart'}</td>
                      <td className="table-td font-bold">₩{p.price?.toLocaleString()}</td>
                      <td className="table-td">
                        <span className={`font-medium ${p.stock < 10 ? 'text-red-500' : 'text-gray-800'}`}>{p.stock}</span>
                      </td>
                      <td className="table-td">
                        <StatusBadge status={status} />
                      </td>
                      <td className="table-td">
                        {p.isFeatured ? <span className="badge bg-amber-100 text-amber-700">Featured</span> : '—'}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button type="button" aria-label="Edit product" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            onClick={() => setEditingProduct({ ...p, price: p.price, discountPrice: p.discountPrice || '', stock: p.stock, categoryId: p.category?.id || '', imageUrl: p.images?.[0]?.url || '' })}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          {status === 'ACTIVE' && (
                            <button
                              type="button"
                              aria-label="Hide product"
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => { setHideModal({ product: p }); setHideReason(''); }}
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}
                          {status === 'INACTIVE' && (
                            <button
                              type="button"
                              aria-label="Show product"
                              className="p-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50"
                              onClick={() => visibilityMutation.mutate({ id: p.id, visible: true })}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button type="button" aria-label="Delete product" className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
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
