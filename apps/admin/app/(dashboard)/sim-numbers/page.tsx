'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simApi } from '../../../lib/api';
import { Plus, Upload, Search, Filter, Eye, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function SimNumbersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ fullNumber: '', carrier: 'SKT', simType: 'PREPAID', price: '', activationRequired: true, requiresIdVerification: true });
  const [search, setSearch] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['sim-orders'],
    queryFn: () => simApi.getOrders({ page: 1, limit: 50 }).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => simApi.addNumber(data),
    onSuccess: () => { toast.success('SIM number added!'); setShowAdd(false); qc.invalidateQueries({ queryKey: ['sim-orders'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: any) => simApi.updateOrderStatus(id, status, notes),
    onSuccess: () => { toast.success('Status updated!'); qc.invalidateQueries({ queryKey: ['sim-orders'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    const formData = new FormData();
    formData.append('file', files[0]);
    try {
      await simApi.addNumber(formData);
      toast.success('Bulk upload successful!');
      setShowBulk(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] } });

  const orders = ordersData?.orders || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SIM Card Management</h1>
          <p className="text-gray-500 mt-1">Manage SIM numbers and orders</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowBulk(true)} className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Bulk Upload
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add SIM Number
          </button>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">Add SIM Number</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">Phone Number</label>
                <input className="form-input" placeholder="01012345678" value={form.fullNumber} onChange={(e) => setForm({ ...form, fullNumber: e.target.value })} />
              </div>
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
                <label className="form-label">Price (₩)</label>
                <input type="number" className="form-input" placeholder="30000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.activationRequired} onChange={(e) => setForm({ ...form, activationRequired: e.target.checked })} />
                  Activation Required
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.requiresIdVerification} onChange={(e) => setForm({ ...form, requiresIdVerification: e.target.checked })} />
                  ID Verification Required
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                onClick={() => addMutation.mutate({ ...form, price: parseFloat(form.price) })}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? 'Adding...' : 'Add Number'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">Bulk Upload SIM Numbers</h2>
            <p className="text-sm text-gray-500 mb-4">Upload an Excel or CSV file with columns: phone_number, carrier, sim_type, price, activation_required, requires_id</p>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
            >
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">{isDragActive ? 'Drop it here!' : 'Drag & drop or click to upload'}</p>
              <p className="text-gray-400 text-sm mt-1">.xlsx or .csv files</p>
            </div>
            <button className="btn-secondary w-full mt-4" onClick={() => setShowBulk(false)}>Close</button>
          </div>
        </div>
      )}

      {/* SIM Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">SIM Orders</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Order #', 'Customer', 'SIM Number', 'Carrier', 'Type', 'Price', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No SIM orders yet</td></tr>
                ) : orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-xs">{order.orderNumber}</td>
                    <td className="table-td">
                      <div className="font-medium">{order.customer?.user?.fullName}</div>
                      <div className="text-gray-400 text-xs">{order.customer?.user?.phone}</div>
                    </td>
                    <td className="table-td font-mono font-bold">{order.simNumber?.maskedNumber}</td>
                    <td className="table-td">
                      <span className="badge bg-gray-100 text-gray-700">{order.simNumber?.carrier}</span>
                    </td>
                    <td className="table-td text-xs">{order.simNumber?.simType?.replace('_', ' ')}</td>
                    <td className="table-td font-semibold">₩{order.price?.toLocaleString()}</td>
                    <td className="table-td">
                      <span className={`badge ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              className="btn-primary text-xs py-1 px-3"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'CONFIRMED' })}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-danger text-xs py-1 px-3"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'CANCELLED' })}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            className="btn-secondary text-xs py-1 px-3"
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'PROCESSING' })}
                          >
                            Process
                          </button>
                        )}
                        {order.status === 'PROCESSING' && (
                          <button
                            className="btn-secondary text-xs py-1 px-3"
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'OUT_FOR_DELIVERY' })}
                          >
                            Ship
                          </button>
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
    </div>
  );
}
