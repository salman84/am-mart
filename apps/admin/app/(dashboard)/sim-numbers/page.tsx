'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simApi } from '../../../lib/api';
import { Plus, Upload, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE:        'bg-green-100 text-green-700',
  HIDDEN:           'bg-gray-100 text-gray-500',
  RESERVED:         'bg-yellow-100 text-yellow-700',
  CONFIRMED:        'bg-blue-100 text-blue-700',
  PROCESSING:       'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED:        'bg-gray-100 text-gray-700',
  CANCELLED:        'bg-red-100 text-red-700',
};

const BLANK_FORM = {
  fullNumber: '', numberPrefix: '', carrier: 'SKT', simType: 'PREPAID',
  price: '', activationRequired: true, requiresIdVerification: true, notes: '',
};

export default function SimNumbersPage() {
  const qc = useQueryClient();

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]     = useState<'inventory' | 'orders'>('inventory');
  const [showAdd, setShowAdd]         = useState(false);
  const [showBulk, setShowBulk]       = useState(false);
  const [addMode, setAddMode]         = useState<'full' | 'prefix'>('full');
  const [form, setForm]               = useState({ ...BLANK_FORM });
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editForm, setEditForm]       = useState<any>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: numbersData, isLoading: numbersLoading } = useQuery({
    queryKey: ['sim-numbers'],
    queryFn: () => simApi.getNumbers({ limit: 200 }).then((r) => r.data),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['sim-orders'],
    queryFn: () => simApi.getOrders({ page: 1, limit: 50 }).then((r) => r.data),
    enabled: activeTab === 'orders',
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (data: any) => simApi.addNumber(data),
    onSuccess: () => {
      toast.success('SIM number added!');
      setShowAdd(false);
      setForm({ ...BLANK_FORM });
      qc.invalidateQueries({ queryKey: ['sim-numbers'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: any) => simApi.editNumber(id, data),
    onSuccess: () => {
      toast.success('Updated!');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['sim-numbers'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => simApi.deleteNumber(id),
    onSuccess: () => {
      toast.success('Deleted!');
      setDeleteConfirmId(null);
      qc.invalidateQueries({ queryKey: ['sim-numbers'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Cannot delete'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => simApi.toggleNumber(id),
    onSuccess: () => {
      toast.success('Visibility updated!');
      qc.invalidateQueries({ queryKey: ['sim-numbers'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: any) => simApi.updateOrderStatus(id, status, notes),
    onSuccess: () => { toast.success('Status updated!'); qc.invalidateQueries({ queryKey: ['sim-orders'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    const fd = new FormData();
    fd.append('file', files[0]);
    try {
      await simApi.addNumber(fd);
      toast.success('Bulk upload successful!');
      setShowBulk(false);
      qc.invalidateQueries({ queryKey: ['sim-numbers'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    }
  }, [qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
  });

  const allNumbers  = numbersData?.numbers || [];
  const fullNumbers = allNumbers.filter((n: any) => !n.customerChoosesLastFour);
  const prefixNums  = allNumbers.filter((n: any) => n.customerChoosesLastFour);
  const orders      = ordersData?.orders || [];

  // ── Submit add ────────────────────────────────────────────────────────────
  const handleAdd = () => {
    const price = parseFloat(form.price);
    if (addMode === 'prefix') {
      addMutation.mutate({
        numberPrefix: form.numberPrefix, customerChoosesLastFour: true,
        carrier: form.carrier, simType: form.simType, price,
        activationRequired: form.activationRequired,
        requiresIdVerification: form.requiresIdVerification,
        notes: form.notes || undefined,
      });
    } else {
      addMutation.mutate({
        fullNumber: form.fullNumber, carrier: form.carrier, simType: form.simType, price,
        activationRequired: form.activationRequired,
        requiresIdVerification: form.requiresIdVerification,
        notes: form.notes || undefined,
      });
    }
  };

  const isAddDisabled = addMutation.isPending
    || !form.price || isNaN(parseFloat(form.price))
    || (addMode === 'full' ? !form.fullNumber : form.numberPrefix.length < 7);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SIM Card Management</h1>
          <p className="text-gray-500 mt-1">Manage SIM inventory and orders</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowBulk(true)} className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Bulk Upload
          </button>
          <button onClick={() => { setShowAdd(true); setForm({ ...BLANK_FORM }); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add SIM Number
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['inventory', 'orders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors capitalize ${
              activeTab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t === 'inventory'
              ? `SIM Inventory (${allNumbers.length})`
              : `Orders (${ordersData?.total ?? '…'})`}
          </button>
        ))}
      </div>

      {/* ══ INVENTORY TAB ═══════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <>
          {numbersLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-8">

              {/* Full Numbers */}
              <NumberSection
                title="Full Numbers"
                subtitle="Numbers with complete phone number assigned"
                numbers={fullNumbers}
                editingId={editingId}
                editForm={editForm}
                setEditingId={setEditingId}
                setEditForm={setEditForm}
                deleteConfirmId={deleteConfirmId}
                setDeleteConfirmId={setDeleteConfirmId}
                onSaveEdit={(id) => editMutation.mutate({ id, data: editForm })}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggle={(id) => toggleMutation.mutate(id)}
                savePending={editMutation.isPending}
                deletePending={deleteMutation.isPending}
              />

              {/* Prefix Numbers */}
              <NumberSection
                title="Prefix Numbers — Customer Picks Last 4"
                subtitle="Admin sets the first 7 digits; customer chooses the last 4"
                numbers={prefixNums}
                editingId={editingId}
                editForm={editForm}
                setEditingId={setEditingId}
                setEditForm={setEditForm}
                deleteConfirmId={deleteConfirmId}
                setDeleteConfirmId={setDeleteConfirmId}
                onSaveEdit={(id) => editMutation.mutate({ id, data: editForm })}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggle={(id) => toggleMutation.mutate(id)}
                savePending={editMutation.isPending}
                deletePending={deleteMutation.isPending}
              />

            </div>
          )}
        </>
      )}

      {/* ══ ORDERS TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">SIM Orders</h2>
          </div>
          {ordersLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Order #', 'Customer', 'SIM Number', 'Carrier', 'Type', 'Price', 'Status', 'Test?', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-10 text-gray-400">No SIM orders yet</td></tr>
                  ) : orders.map((order: any) => (
                    <tr key={order.id} className={`hover:bg-gray-50 ${order.isAdminTest ? 'bg-orange-50' : ''}`}>
                      <td className="table-td font-mono text-xs">{order.orderNumber}</td>
                      <td className="table-td">
                        <div className="font-medium">{order.customer?.user?.fullName}</div>
                        <div className="text-gray-400 text-xs">{order.customer?.user?.phone}</div>
                      </td>
                      <td className="table-td">
                        <span className="font-mono font-bold">{order.simNumber?.maskedNumber}</span>
                        {order.simNumber?.customerChoosesLastFour && (
                          <span className="ml-2 badge bg-purple-100 text-purple-700 text-xs">Custom last 4</span>
                        )}
                      </td>
                      <td className="table-td"><span className="badge bg-gray-100 text-gray-700">{order.simNumber?.carrier}</span></td>
                      <td className="table-td text-xs">{order.simNumber?.simType?.replace('_', ' ')}</td>
                      <td className="table-td font-semibold">₩{order.price?.toLocaleString()}</td>
                      <td className="table-td">
                        <span className={`badge ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                      </td>
                      <td className="table-td">
                        {order.isAdminTest && <span className="badge bg-orange-100 text-orange-700 text-xs">TEST</span>}
                      </td>
                      <td className="table-td text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-1.5">
                          {order.status === 'PENDING' && (
                            <>
                              <button className="btn-primary text-xs py-1 px-3"
                                onClick={() => statusMutation.mutate({ id: order.id, status: 'CONFIRMED' })}>✓ Approve</button>
                              <button className="btn-danger text-xs py-1 px-3"
                                onClick={() => { const r = prompt('Rejection reason:') || 'Not available'; statusMutation.mutate({ id: order.id, status: 'CANCELLED', notes: r }); }}>✕ Reject</button>
                            </>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button className="btn-secondary text-xs py-1 px-3"
                              onClick={() => statusMutation.mutate({ id: order.id, status: 'PROCESSING' })}>⚙ Processing</button>
                          )}
                          {order.status === 'PROCESSING' && (
                            <button className="btn-secondary text-xs py-1 px-3"
                              onClick={() => statusMutation.mutate({ id: order.id, status: 'OUT_FOR_DELIVERY' })}>🚚 Dispatch</button>
                          )}
                          {order.status === 'OUT_FOR_DELIVERY' && (
                            <button className="btn-primary text-xs py-1 px-3"
                              onClick={() => statusMutation.mutate({ id: order.id, status: 'DELIVERED' })}>✓ Delivered</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ ADD SIM MODAL ══════════════════════════════════════════════════ */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Add SIM Number</h2>

            <div className="flex rounded-xl border border-gray-200 p-1 mb-4 gap-1">
              {(['full', 'prefix'] as const).map((m) => (
                <button key={m}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${addMode === m ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  onClick={() => setAddMode(m)}
                >
                  {m === 'full' ? 'Full Number' : 'Prefix + Customer Picks Last 4'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {addMode === 'full' ? (
                <div>
                  <label className="form-label">Full Phone Number</label>
                  <input className="form-input" placeholder="01012345678"
                    value={form.fullNumber} onChange={(e) => setForm({ ...form, fullNumber: e.target.value })} />
                  <p className="text-xs text-gray-400 mt-1">Complete phone number (10–11 digits)</p>
                </div>
              ) : (
                <div>
                  <label className="form-label">Number Prefix (first 7 digits)</label>
                  <div className="flex items-center gap-2">
                    <input className="form-input flex-1" placeholder="0101234" maxLength={8}
                      value={form.numberPrefix}
                      onChange={(e) => setForm({ ...form, numberPrefix: e.target.value.replace(/\D/g, '') })} />
                    <span className="text-gray-500 font-mono text-lg font-bold">- ????</span>
                  </div>
                  {form.numberPrefix.length >= 7 && (
                    <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-700 font-semibold">
                        Preview: {form.numberPrefix.slice(0,3)}-{form.numberPrefix.slice(3,7)}-????
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Carrier</label>
                  <select className="form-input" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })}>
                    <option value="SKT">SKT</option>
                    <option value="KT">KT</option>
                    <option value="LG_UPLUS">LG U+</option>
                    <option value="MVNO">MVNO</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">SIM Type</label>
                  <select className="form-input" value={form.simType} onChange={(e) => setForm({ ...form, simType: e.target.value })}>
                    <option value="PREPAID">Prepaid</option>
                    <option value="DATA_ONLY">Data Only</option>
                    <option value="VOICE_DATA">Voice + Data</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Price (₩) <span className="text-red-500">*</span></label>
                <input type="number" className="form-input" placeholder="30000"
                  value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>

              <div>
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" placeholder="Any notes for this SIM..."
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.activationRequired}
                    onChange={(e) => setForm({ ...form, activationRequired: e.target.checked })} />
                  Activation Required
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.requiresIdVerification}
                    onChange={(e) => setForm({ ...form, requiresIdVerification: e.target.checked })} />
                  ID Verification Required
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleAdd} disabled={isAddDisabled}>
                {addMutation.isPending ? 'Adding…' : addMode === 'prefix' ? 'Add Prefix Number' : 'Add Number'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BULK UPLOAD MODAL ══════════════════════════════════════════════ */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">Bulk Upload SIM Numbers</h2>
            <p className="text-sm text-gray-500 mb-4">Upload Excel or CSV with columns: phone_number, carrier, sim_type, price, activation_required, requires_id</p>
            <div {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}>
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">{isDragActive ? 'Drop here!' : 'Drag & drop or click'}</p>
              <p className="text-gray-400 text-sm mt-1">.xlsx or .csv</p>
            </div>
            <button className="btn-secondary w-full mt-4" onClick={() => setShowBulk(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── NumberSection component ────────────────────────────────────────────── */

function NumberSection({
  title, subtitle, numbers, editingId, editForm, setEditingId, setEditForm,
  deleteConfirmId, setDeleteConfirmId, onSaveEdit, onDelete, onToggle,
  savePending, deletePending,
}: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="badge bg-gray-100 text-gray-600">{numbers.length} numbers</span>
      </div>

      {numbers.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">No numbers added yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Number', 'Carrier', 'Type', 'Price', 'Status', 'Activation', 'ID Verify', 'Notes', 'Actions'].map((h) => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {numbers.map((sim: any) => (
                <tr key={sim.id} className={`hover:bg-gray-50 ${sim.status === 'HIDDEN' ? 'opacity-50' : ''}`}>
                  {editingId === sim.id ? (
                    /* ── Inline edit row ── */
                    <>
                      <td className="table-td font-mono font-bold text-sm">{sim.maskedNumber}</td>
                      <td className="table-td">
                        <select className="form-input py-1 text-xs w-24"
                          value={editForm.carrier ?? sim.carrier}
                          onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}>
                          <option value="SKT">SKT</option>
                          <option value="KT">KT</option>
                          <option value="LG_UPLUS">LG U+</option>
                          <option value="MVNO">MVNO</option>
                        </select>
                      </td>
                      <td className="table-td">
                        <select className="form-input py-1 text-xs w-32"
                          value={editForm.simType ?? sim.simType}
                          onChange={(e) => setEditForm({ ...editForm, simType: e.target.value })}>
                          <option value="PREPAID">Prepaid</option>
                          <option value="DATA_ONLY">Data Only</option>
                          <option value="VOICE_DATA">Voice + Data</option>
                        </select>
                      </td>
                      <td className="table-td">
                        <input type="number" className="form-input py-1 text-xs w-28"
                          value={editForm.price ?? sim.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                      </td>
                      <td className="table-td">
                        <span className={`badge ${STATUS_COLORS[sim.status] || 'bg-gray-100 text-gray-600'}`}>{sim.status}</span>
                      </td>
                      <td className="table-td">
                        <input type="checkbox"
                          checked={editForm.activationRequired ?? sim.activationRequired}
                          onChange={(e) => setEditForm({ ...editForm, activationRequired: e.target.checked })} />
                      </td>
                      <td className="table-td">
                        <input type="checkbox"
                          checked={editForm.requiresIdVerification ?? sim.requiresIdVerification}
                          onChange={(e) => setEditForm({ ...editForm, requiresIdVerification: e.target.checked })} />
                      </td>
                      <td className="table-td">
                        <input className="form-input py-1 text-xs w-32"
                          value={editForm.notes ?? sim.notes ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1.5">
                          <button className="btn-primary text-xs py-1 px-3" disabled={savePending}
                            onClick={() => onSaveEdit(sim.id)}>
                            {savePending ? '…' : 'Save'}
                          </button>
                          <button className="btn-secondary text-xs py-1 px-3"
                            onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* ── Normal row ── */
                    <>
                      <td className="table-td font-mono font-bold text-sm">{sim.maskedNumber}</td>
                      <td className="table-td"><span className="badge bg-gray-100 text-gray-700">{sim.carrier}</span></td>
                      <td className="table-td text-xs text-gray-600">{sim.simType?.replace('_', ' ')}</td>
                      <td className="table-td font-semibold">₩{sim.price?.toLocaleString()}</td>
                      <td className="table-td">
                        <span className={`badge ${STATUS_COLORS[sim.status] || 'bg-gray-100 text-gray-600'}`}>{sim.status}</span>
                      </td>
                      <td className="table-td text-center">
                        {sim.activationRequired ? '✓' : '–'}
                      </td>
                      <td className="table-td text-center">
                        {sim.requiresIdVerification ? '✓' : '–'}
                      </td>
                      <td className="table-td text-xs text-gray-500 max-w-[120px] truncate">{sim.notes || '–'}</td>
                      <td className="table-td">
                        <div className="flex gap-1.5 items-center">
                          {/* Edit */}
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-600" title="Edit"
                            onClick={() => { setEditingId(sim.id); setEditForm({}); }}>
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Hide / Unhide */}
                          {['AVAILABLE', 'HIDDEN'].includes(sim.status) && (
                            <button
                              className={`p-1.5 rounded-lg hover:bg-gray-100 ${sim.status === 'HIDDEN' ? 'text-green-600' : 'text-gray-500'}`}
                              title={sim.status === 'HIDDEN' ? 'Unhide' : 'Hide'}
                              onClick={() => onToggle(sim.id)}>
                              {sim.status === 'HIDDEN' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Delete */}
                          {deleteConfirmId === sim.id ? (
                            <div className="flex gap-1 items-center">
                              <span className="text-xs text-red-600 font-semibold">Sure?</span>
                              <button className="btn-danger text-xs py-0.5 px-2" disabled={deletePending}
                                onClick={() => onDelete(sim.id)}>Yes</button>
                              <button className="btn-secondary text-xs py-0.5 px-2"
                                onClick={() => setDeleteConfirmId(null)}>No</button>
                            </div>
                          ) : (
                            <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"
                              onClick={() => setDeleteConfirmId(sim.id)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
