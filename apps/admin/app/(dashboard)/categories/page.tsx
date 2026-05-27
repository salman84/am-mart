'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../../lib/api';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, FolderOpen, Folder } from 'lucide-react';
import toast from 'react-hot-toast';

const ICONS = [
  'nutrition-outline', 'water-outline', 'cafe-outline', 'layers-outline',
  'wine-outline', 'body-outline', 'sparkles-outline', 'fast-food-outline',
  'snow-outline', 'flask-outline', 'ellipse-outline', 'archive-outline',
  'basket-outline', 'cart-outline', 'storefront-outline', 'pricetag-outline',
  'leaf-outline', 'fish-outline', 'pizza-outline', 'ice-cream-outline',
];

const BLANK = { name: '', nameKr: '', slug: '', icon: 'basket-outline', parentId: '', sortOrder: 0 };

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function CategoryRow({ cat, depth, onEdit, onDelete, allCats }: any) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = cat.children?.length > 0;
  const indent = depth * 20;

  return (
    <>
      <tr className="hover:bg-gray-50 border-b border-gray-50">
        <td className="table-td">
          <div className="flex items-center gap-2" style={{ paddingLeft: indent }}>
            {hasChildren ? (
              <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600">
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-4 h-4 inline-block" />
            )}
            {hasChildren ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-gray-400" />}
            <span className={`font-${depth === 0 ? 'bold' : depth === 1 ? 'semibold' : 'medium'} text-sm`}>{cat.name}</span>
            {cat.nameKr && <span className="text-xs text-gray-400 ml-1">({cat.nameKr})</span>}
          </div>
        </td>
        <td className="table-td text-xs text-gray-400">{cat.slug}</td>
        <td className="table-td text-xs">{cat.icon || '—'}</td>
        <td className="table-td text-xs">{cat.sortOrder}</td>
        <td className="table-td">
          <span className={`badge ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {cat.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="table-td">
          <span className="text-xs text-gray-400">
            {depth === 0 ? 'Main' : depth === 1 ? 'Sub' : 'Sub-Sub'}
          </span>
        </td>
        <td className="table-td">
          <div className="flex gap-2">
            <button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => onEdit(cat)}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              onClick={() => { if (confirm(`Delete "${cat.name}"?`)) onDelete(cat.id); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {open && hasChildren && cat.children.map((child: any) => (
        <CategoryRow key={child.id} cat={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} allCats={allCats} />
      ))}
    </>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(BLANK);
  const [editId, setEditId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
  });

  const cats: any[] = data?.categories || [];

  // Flat list for parent picker
  function flattenCats(list: any[], depth = 0): any[] {
    return list.flatMap((c) => [
      { ...c, _depth: depth },
      ...(c.children ? flattenCats(c.children, depth + 1) : []),
    ]);
  }
  const flatCats = flattenCats(cats);

  const createMutation = useMutation({
    mutationFn: (data: any) => categoriesApi.create(data),
    onSuccess: () => { toast.success('Category created'); qc.invalidateQueries({ queryKey: ['categories-admin'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => categoriesApi.update(id, data),
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: ['categories-admin'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['categories-admin'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openCreate = () => { setForm(BLANK); setEditId(null); setShowModal(true); };
  const openEdit = (cat: any) => {
    setForm({ name: cat.name, nameKr: cat.nameKr || '', slug: cat.slug, icon: cat.icon || 'basket-outline', parentId: cat.parentId || '', sortOrder: cat.sortOrder });
    setEditId(cat.id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm(BLANK); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, parentId: form.parentId || null, isActive: true };
    if (!payload.slug) payload.slug = slugify(payload.name);
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Manage product categories (Main → Sub → Sub-Sub)</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><FolderOpen className="w-4 h-4 text-amber-500" /> Main Category (Level 1)</span>
        <span className="flex items-center gap-1"><Folder className="w-4 h-4 text-gray-400" /> Sub / Sub-Sub</span>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">{editId ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Parent selector */}
              <div>
                <label className="form-label">Level / Parent Category</label>
                <select className="form-input" value={form.parentId} onChange={(e) => setForm((f: any) => ({ ...f, parentId: e.target.value }))}>
                  <option value="">── Main Category (Level 1)</option>
                  {flatCats.map((c) => (
                    <option key={c.id} value={c.id} disabled={c._depth >= 2}>
                      {'  '.repeat(c._depth)}{c._depth === 0 ? '▸ ' : c._depth === 1 ? '  └ ' : '     └ '}{c.name}
                      {c._depth >= 2 ? ' (max depth)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {!form.parentId ? 'This will be a top-level (Main) category' :
                    flatCats.find(c => c.id === form.parentId)?._depth === 0 ? 'This will be a Sub-category' : 'This will be a Sub-Sub category'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Name (English) *</label>
                  <input className="form-input" required value={form.name}
                    onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} />
                </div>
                <div>
                  <label className="form-label">Name (Korean)</label>
                  <input className="form-input" value={form.nameKr} placeholder="한국어"
                    onChange={(e) => setForm((f: any) => ({ ...f, nameKr: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Slug (auto-generated)</label>
                  <input className="form-input bg-gray-50" value={form.slug}
                    onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Sort Order</label>
                  <input type="number" className="form-input" value={form.sortOrder}
                    onChange={(e) => setForm((f: any) => ({ ...f, sortOrder: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <label className="form-label">Icon</label>
                <select className="form-input" value={form.icon} onChange={(e) => setForm((f: any) => ({ ...f, icon: e.target.value }))}>
                  {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Slug', 'Icon', 'Order', 'Status', 'Level', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No categories yet. Click Add Category to create one.</td></tr>
                ) : (
                  cats.map((cat) => (
                    <CategoryRow key={cat.id} cat={cat} depth={0}
                      onEdit={openEdit} onDelete={(id: string) => deleteMutation.mutate(id)} allCats={cats} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
