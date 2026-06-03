'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, warehouseApi } from '../../../lib/api';
import { Route, Plus, Eye, X, UserPlus, Play, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  PARTIALLY_COMPLETED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function CreateModal({
  centers, onClose, onSuccess,
}: {
  centers: any[]; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    fulfillmentCenterId: '', plannedDate: new Date().toISOString().split('T')[0], notes: '',
  });
  const mutation = useMutation({
    mutationFn: (d: any) => routesApi.create(d),
    onSuccess: () => { toast.success('Route created'); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Create Route</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            fulfillmentCenterId: form.fulfillmentCenterId || undefined,
            plannedDate: form.plannedDate, notes: form.notes || undefined,
          });
        }} className="space-y-4">
          <div>
            <label className="form-label">Fulfillment Center</label>
            <select className="form-input" value={form.fulfillmentCenterId}
              onChange={(e) => setForm(f => ({ ...f, fulfillmentCenterId: e.target.value }))}>
              <option value="">— None —</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Planned Date *</label>
            <input className="form-input" type="date" required value={form.plannedDate}
              onChange={(e) => setForm(f => ({ ...f, plannedDate: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RouteDetail({ route, onClose }: { route: any; onClose: () => void }) {
  const { data: fullData } = useQuery({
    queryKey: ['route-detail', route.id],
    queryFn: () => routesApi.getOne(route.id).then(r => r.data),
  });
  const full = fullData?.route || route;
  const stops = full.stops || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Route: {full.routeNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-xs text-gray-400">Status</span>
            <div><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[full.status] || ''}`}>{full.status?.replace('_', ' ')}</span></div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Driver</span>
            <div className="font-semibold">{full.rider?.user?.fullName || 'Unassigned'}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Planned Date</span>
            <div>{new Date(full.plannedDate).toLocaleDateString()}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Stops</span>
            <div>{full.completedStops}/{full.totalStops} completed, {full.failedStops} failed</div>
          </div>
          {full.fulfillmentCenter && <div>
            <span className="text-xs text-gray-400">Center</span>
            <div>{full.fulfillmentCenter.name}</div>
          </div>}
        </div>

        {stops.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Stops ({stops.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {stops.map((stop: any, i: number) => (
                <div key={stop.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {stop.stopOrder}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{stop.customerName || 'Customer'}</div>
                    <div className="text-xs text-gray-500 truncate">{stop.addressLine1}</div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                    stop.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    stop.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    stop.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{stop.status}</span>
                  {stop.package && (
                    <span className="text-xs font-mono text-gray-400 flex-shrink-0">{stop.package.trackingNumber}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryRoutesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailRoute, setDetailRoute] = useState<any>(null);

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-routes', statusFilter, dateFilter],
    queryFn: () => routesApi.getAll({
      limit: 50, status: statusFilter || undefined, date: dateFilter || undefined,
    }).then(r => r.data),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => routesApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Route updated'); qc.invalidateQueries({ queryKey: ['delivery-routes'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const routes: any[] = data?.routes || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Routes</h1>
          <p className="text-gray-500 mt-1">Plan and manage delivery routes for drivers</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Create Route
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="form-input max-w-[180px]" type="date" value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)} />
        {Object.keys(statusColors).map(s => (
          <button key={s}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s ? 'bg-primary text-white' : statusColors[s] + ' hover:opacity-80'
            }`}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showCreate && (
        <CreateModal centers={centers} onClose={() => setShowCreate(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['delivery-routes'] })} />
      )}
      {detailRoute && <RouteDetail route={detailRoute} onClose={() => setDetailRoute(null)} />}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded" />)}</div>
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Route className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No routes found</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>Create First Route</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Route #</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Driver</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Center</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Stops</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {routes.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{r.routeNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {r.rider?.user?.fullName || <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.fulfillmentCenter?.name || '—'}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span className="text-green-600 font-semibold">{r.completedStops}</span>
                    <span className="text-gray-400">/{r.totalStops}</span>
                    {r.failedStops > 0 && <span className="text-red-500 ml-1">({r.failedStops}✗)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[r.status] || ''}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(r.plannedDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        onClick={() => setDetailRoute(r)}>
                        <Eye className="w-4 h-4" />
                      </button>
                      {r.status === 'ASSIGNED' && (
                        <button className="px-2 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold"
                          onClick={() => statusM.mutate({ id: r.id, status: 'IN_PROGRESS' })}>
                          Start
                        </button>
                      )}
                      {r.status === 'IN_PROGRESS' && (
                        <button className="px-2 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold"
                          onClick={() => statusM.mutate({ id: r.id, status: 'COMPLETED' })}>
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Total: {data?.total || routes.length} routes
          </div>
        </div>
      )}
    </div>
  );
}
