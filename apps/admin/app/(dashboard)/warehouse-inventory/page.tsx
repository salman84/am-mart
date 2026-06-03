'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../../../lib/api';
import { Package, Plus, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

function AdjustModal({
  centerId, onClose, onSuccess,
}: {
  centerId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [quantityChange, setQuantityChange] = useState(0);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => warehouseApi.adjustInventory(centerId, data),
    onSuccess: () => { toast.success('Inventory adjusted'); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Adjust Inventory</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ productId, sellerId, quantityChange, reason: reason || undefined });
        }} className="space-y-4">
          <div>
            <label className="form-label">Product ID *</label>
            <input className="form-input" required value={productId}
              onChange={(e) => setProductId(e.target.value)} placeholder="Paste product ID" />
          </div>
          <div>
            <label className="form-label">Seller ID *</label>
            <input className="form-input" required value={sellerId}
              onChange={(e) => setSellerId(e.target.value)} placeholder="Paste seller ID" />
          </div>
          <div>
            <label className="form-label">Quantity Change *</label>
            <input className="form-input" type="number" required value={quantityChange}
              onChange={(e) => setQuantityChange(Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-1">Positive = add, Negative = remove</p>
          </div>
          <div>
            <label className="form-label">Reason</label>
            <input className="form-input" value={reason}
              onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adjusting...' : 'Adjust'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WarehouseInventoryPage() {
  const qc = useQueryClient();
  const [centerId, setCenterId] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data: invData, isLoading } = useQuery({
    queryKey: ['warehouse-inv', centerId],
    queryFn: () => centerId
      ? warehouseApi.getInventory(centerId, { limit: 100 }).then(r => r.data)
      : Promise.resolve({ inventory: [], total: 0 }),
    enabled: !!centerId,
  });

  const items: any[] = invData?.inventory || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Inventory</h1>
          <p className="text-gray-500 mt-1">View and manage inventory across fulfillment centers</p>
        </div>
        <div className="flex gap-2">
          {centerId && (
            <>
              <button className="btn-secondary flex items-center gap-2"
                onClick={() => qc.invalidateQueries({ queryKey: ['warehouse-inv'] })}>
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdjust(true)}>
                <Plus className="w-4 h-4" /> Adjust
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <select className="form-input max-w-xs" value={centerId}
          onChange={(e) => setCenterId(e.target.value)}>
          <option value="">Select Fulfillment Center</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      {showAdjust && centerId && (
        <AdjustModal centerId={centerId} onClose={() => setShowAdjust(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['warehouse-inv'] })} />
      )}

      {!centerId ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a fulfillment center to view inventory</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No inventory in this center</p>
          <button className="btn-primary" onClick={() => setShowAdjust(true)}>Add Inventory</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Product ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Seller ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Bin</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Quantity</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Reserved</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Damaged</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Available</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Last Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{item.productId.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{item.sellerId.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.bin ? `${item.bin.binCode} (${item.bin.section || ''})` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-center text-amber-600">{item.reservedQuantity}</td>
                  <td className="px-4 py-3 text-center text-red-600">{item.damagedQuantity}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${
                      (item.quantity - item.reservedQuantity - item.damagedQuantity) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.quantity - item.reservedQuantity - item.damagedQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.lastStockCheck ? new Date(item.lastStockCheck).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Total: {invData?.total || items.length} items
          </div>
        </div>
      )}
    </div>
  );
}
