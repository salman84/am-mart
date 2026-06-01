'use client';

import { useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, categoriesApi, uploadApi } from '../../../lib/api';
import { Upload, X, Zap, Smartphone, TrendingUp, Folder, FolderOpen, Eye, EyeOff, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Main page icon definitions ──────────────────────────────────────────────
const MAIN_ICONS = [
  {
    key: 'ICON_TOPUP',
    label: 'Top-up Icon',
    desc: 'Shown on home screen quick-service for mobile top-up',
    fallback: '⚡',
    Icon: Zap,
    color: '#F97316',
    bg: '#FFF7ED',
  },
  {
    key: 'ICON_SIM_CARDS',
    label: 'SIM Cards Icon',
    desc: 'Shown on home screen quick-service for SIM card sales',
    fallback: '📱',
    Icon: Smartphone,
    color: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    key: 'ICON_RATE_INQUIRY',
    label: 'Rate Inquiry Icon',
    desc: 'Shown on home screen quick-service for exchange rates',
    fallback: '📈',
    Icon: TrendingUp,
    color: '#10B981',
    bg: '#ECFDF5',
  },
];

// ── Tree helpers ─────────────────────────────────────────────────────────────
function buildTree(flatList: any[]) {
  const roots: any[] = [];
  const map: Record<string, any> = {};
  flatList.forEach((c) => { map[c.id] = { ...c, children: [] }; });
  flatList.forEach((c) => {
    if (c.parentId && map[c.parentId]) {
      map[c.parentId].children.push(map[c.id]);
    } else if (!c.parentId) {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

function levelLabel(depth: number) {
  return depth === 0 ? 'Main' : depth === 1 ? 'Sub' : 'Sub-Sub';
}

// ── Single icon upload card (for main page icons) ────────────────────────────
function MainIconCard({
  def,
  value,
  uploading,
  onUpload,
  onRemove,
}: {
  def: (typeof MAIN_ICONS)[number];
  value: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { Icon, color, bg } = def;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div>
        <p className="text-sm font-bold text-gray-800">{def.label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{def.desc}</p>
      </div>

      {/* Preview */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-gray-100"
        style={{ backgroundColor: bg }}
      >
        {value ? (
          <img src={value} alt={def.label} className="w-10 h-10 object-contain" />
        ) : (
          <Icon className="w-8 h-8" style={{ color }} />
        )}
      </div>

      {value && (
        <p className="text-xs text-emerald-600 text-center flex items-center justify-center gap-1">
          ✓ Custom icon active
        </p>
      )}

      <div className="flex gap-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUpload}
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
        >
          <Upload className="w-3 h-3" />
          {uploading ? 'Uploading…' : value ? 'Change' : 'Upload'}
        </button>
        {value && (
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-semibold hover:bg-red-100"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Category row (recursive) ─────────────────────────────────────────────────
function CategoryRow({
  cat,
  depth,
  uploadingId,
  onUpload,
  onRemove,
  onToggle,
  onDelete,
}: {
  cat: any;
  depth: number;
  uploadingId: string | null;
  onUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
  onToggle: (cat: any) => void;
  onDelete: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = cat.children?.length > 0;
  const indent = depth * 24;

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50">
        {/* Name + expand */}
        <td className="table-td">
          <div className="flex items-center gap-2" style={{ paddingLeft: indent }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-4 h-4 flex-shrink-0" />
            )}
            {hasChildren
              ? <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
              : <Folder className="w-4 h-4 text-gray-300 flex-shrink-0" />
            }
            <span className={`text-sm ${depth === 0 ? 'font-bold' : depth === 1 ? 'font-semibold' : 'font-medium'} text-gray-800`}>
              {cat.name}
            </span>
            {cat.nameKr && (
              <span className="text-xs text-gray-400">({cat.nameKr})</span>
            )}
          </div>
        </td>

        {/* Icon preview */}
        <td className="table-td">
          <div className="flex items-center gap-2">
            {cat.image ? (
              <div className="relative group w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                <img src={cat.image} alt={cat.name} className="w-8 h-8 object-contain" />
              </div>
            ) : cat.icon ? (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-mono">{cat.icon}</span>
            ) : (
              <span className="text-xs text-gray-300">—</span>
            )}
          </div>
        </td>

        {/* Level */}
        <td className="table-td">
          <span className={`badge text-xs ${
            depth === 0 ? 'bg-purple-100 text-purple-700'
            : depth === 1 ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
          }`}>
            {levelLabel(depth)}
          </span>
        </td>

        {/* Status */}
        <td className="table-td">
          <span className={`badge text-xs ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
            {cat.isActive ? 'Active' : 'Hidden'}
          </span>
        </td>

        {/* Actions */}
        <td className="table-td">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUpload(cat.id, e)}
            />
            <button
              type="button"
              disabled={uploadingId === cat.id}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              <Upload className="w-3 h-3" />
              {uploadingId === cat.id ? 'Uploading…' : cat.image ? 'Change' : 'Upload'}
            </button>

            {cat.image && (
              <button
                type="button"
                onClick={() => onRemove(cat.id)}
                title="Remove icon"
                className="p-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggle(cat)}
              title={cat.isActive ? 'Hide category' : 'Show category'}
              className={`p-1.5 rounded-lg ${cat.isActive ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            >
              {cat.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete "${cat.name}"? This will hide it from the app.`)) {
                  onDelete(cat.id);
                }
              }}
              title="Delete category"
              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Recursive children */}
      {open && hasChildren && cat.children.map((child: any) => (
        <CategoryRow
          key={child.id}
          cat={child}
          depth={depth + 1}
          uploadingId={uploadingId}
          onUpload={onUpload}
          onRemove={onRemove}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function IconsPage() {
  const qc = useQueryClient();
  // localOverrides: values set/changed in this session — take priority over DB values
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadingCatId, setUploadingCatId] = useState<string | null>(null);

  // ── Load settings (DB values only — no side effects in queryFn) ──
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  // Merge DB values with local overrides — local overrides win so preview
  // shows instantly after upload without waiting for the refetch to finish
  const settingsValues = useMemo(() => {
    const vals: Record<string, string> = {};
    (settingsData?.settings || []).forEach((s: any) => { vals[s.key] = s.value ?? ''; });
    return { ...vals, ...localOverrides };
  }, [settingsData, localOverrides]);

  // ── Load categories (flat all levels) ──
  const { data: flatCats, isLoading: catsLoading } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => categoriesApi.getAllFlat().then((r) => r.data),
  });

  const categoryTree = useMemo(() => buildTree(flatCats || []), [flatCats]);

  // ── Mutations ──
  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Category hidden');
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // ── Handlers: main page icons ──
  const handleMainIconUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Icon must be under 2MB'); return; }
    // Reset file input so same file can be re-selected if needed
    e.target.value = '';
    setUploadingKey(key);
    try {
      const res = await uploadApi.uploadImage(file, 'icons');
      const url = res.data.url;
      // Set local override immediately — preview shows without waiting for refetch
      setLocalOverrides((v) => ({ ...v, [key]: url }));
      await adminApi.updateSetting(key, url);
      toast.success('Icon saved — app will update when opened/resumed');
      qc.invalidateQueries({ queryKey: ['settings'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleMainIconRemove = async (key: string) => {
    // Clear local override immediately so preview reverts to built-in icon
    setLocalOverrides((v) => ({ ...v, [key]: '' }));
    await adminApi.updateSetting(key, '');
    toast.success('Icon removed — built-in icon restored');
    qc.invalidateQueries({ queryKey: ['settings'] });
  };

  // ── Handlers: category icons ──
  const handleCatIconUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Icon must be under 2MB'); return; }
    setUploadingCatId(id);
    try {
      const res = await uploadApi.uploadImage(file, 'category-icons');
      await updateCategory.mutateAsync({ id, data: { image: res.data.url } });
      toast.success('Category icon updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingCatId(null);
    }
  };

  const handleCatIconRemove = (id: string) => {
    updateCategory.mutate({ id, data: { image: null } });
  };

  const handleCatToggle = (cat: any) => {
    updateCategory.mutate({ id: cat.id, data: { isActive: !cat.isActive } });
  };

  const handleCatDelete = (id: string) => {
    deleteCategory.mutate(id);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Icons</h1>
        <p className="text-gray-500 mt-1">
          Manage app icons — changes reflect instantly in the mobile app when it next opens
        </p>
      </div>

      {/* ── Section 1: Main Page Icons ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-gray-900">Main Page Icons</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Upload custom icons for the Quick Services row on the app home screen.
          If no custom icon is set, the built-in default icon is used automatically.
        </p>

        {settingsLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MAIN_ICONS.map((def) => (
              <MainIconCard
                key={def.key}
                def={def}
                value={settingsValues[def.key] || ''}
                uploading={uploadingKey === def.key}
                onUpload={(e) => handleMainIconUpload(def.key, e)}
                onRemove={() => handleMainIconRemove(def.key)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Product Category Icons ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-gray-900">Product Category Icons</h2>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          Upload custom icons for each product category. Categories are managed in the{' '}
          <a href="/categories" className="text-primary underline font-semibold">Categories section</a>.
          New categories added there appear here automatically.
        </p>
        <p className="text-xs text-gray-400 mb-5">
          <strong>Upload</strong> — set a custom image icon &nbsp;|&nbsp;
          <strong>✕</strong> — remove custom icon (falls back to built-in) &nbsp;|&nbsp;
          <Eye className="w-3 h-3 inline" />/<EyeOff className="w-3 h-3 inline" /> — show/hide &nbsp;|&nbsp;
          <Trash2 className="w-3 h-3 inline" /> — delete
        </p>

        {catsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : categoryTree.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No categories found.{' '}
            <a href="/categories" className="text-primary underline">Add categories</a> first.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="table-th">Category</th>
                  <th className="table-th">Current Icon</th>
                  <th className="table-th">Level</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categoryTree.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    depth={0}
                    uploadingId={uploadingCatId}
                    onUpload={handleCatIconUpload}
                    onRemove={handleCatIconRemove}
                    onToggle={handleCatToggle}
                    onDelete={handleCatDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
