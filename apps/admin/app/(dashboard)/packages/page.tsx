'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi, warehouseApi } from '../../../lib/api';
import { ScanLine, Eye, Search, Tag, Truck, X } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  PICKING: 'bg-yellow-100 text-yellow-700',
  PACKED: 'bg-blue-100 text-blue-700',
  LABELED: 'bg-indigo-100 text-indigo-700',
  SORTED: 'bg-purple-100 text-purple-700',
  SCANNED_OUT: 'bg-cyan-100 text-cyan-700',
  IN_TRANSIT: 'bg-orange-100 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-green-100 text-green-700',
  DELIVERY_FAILED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-pink-100 text-pink-700',
  DAMAGED: 'bg-red-200 text-red-800',
  LOST: 'bg-gray-200 text-gray-800',
};

const allStatuses = Object.keys(statusColors);

function PackageDetail({ pkg, onClose }: { pkg: any; onClose: () => void }) {
  const { data: scanData } = useQuery({
    queryKey: ['pkg-scans', pkg.id],
    queryFn: () => packagesApi.getScans(pkg.id).then(r => r.data),
  });
  const scans = scanData?.scans || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">Package: {pkg.trackingNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-xs text-gray-400">Tracking #</span>
            <div className="font-mono font-semibold">{pkg.trackingNumber}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Barcode</span>
            <div className="font-mono">{pkg.barcode || '—'}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Status</span>
            <div><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[pkg.status] || ''}`}>{pkg.status}</span></div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Center</span>
            <div>{pkg.fulfillmentCenter?.name || '—'}</div>
          </div>
          {pkg.weight && <div>
            <span className="text-xs text-gray-400">Weight</span>
            <div>{pkg.weight} kg</div>
          </div>}
          {pkg.sortZone && <div>
            <span className="text-xs text-gray-400">Sort Zone</span>
            <div>{pkg.sortZone}</div>
          </div>}
          <div>
            <span className="text-xs text-gray-400">Attempts</span>
            <div>{pkg.deliveryAttempts} / {pkg.maxAttempts}</div>
          </div>
        </div>

        {scans.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Scan History</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scans.map((scan: any) => (
                <div key={scan.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold">{scan.scanType}</span>
                    {scan.locationName && <span className="text-gray-500"> — {scan.locationName}</span>}
                    {scan.notes && <span className="text-gray-400"> ({scan.notes})</span>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(scan.scannedAt).toLocaleString()}
                  </span>
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

export default function PackagesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [centerId, setCenterId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [detailPkg, setDetailPkg] = useState<any>(null);

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data, isLoading } = useQuery({
    queryKey: ['packages-list', statusFilter, centerId, search],
    queryFn: () => packagesApi.getAll({
      limit: 50, status: statusFilter || undefined,
      centerId: centerId || undefined, search: search || undefined,
    }).then(r => r.data),
  });

  const pickM = useMutation({
    mutationFn: (id: string) => packagesApi.pick(id),
    onSuccess: () => { toast.success('Picked'); qc.invalidateQueries({ queryKey: ['packages-list'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const packM = useMutation({
    mutationFn: (id: string) => packagesApi.pack(id),
    onSuccess: () => { toast.success('Packed'); qc.invalidateQueries({ queryKey: ['packages-list'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const labelM = useMutation({
    mutationFn: (id: string) => packagesApi.generateLabel(id),
    onSuccess: (res) => { toast.success('Label generated'); qc.invalidateQueries({ queryKey: ['packages-list'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const sortM = useMutation({
    mutationFn: ({ id, zone }: { id: string; zone: string }) => packagesApi.sort(id, zone),
    onSuccess: () => { toast.success('Sorted'); qc.invalidateQueries({ queryKey: ['packages-list'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const loadM = useMutation({
    mutationFn: (id: string) => packagesApi.load(id),
    onSuccess: () => { toast.success('Loaded'); qc.invalidateQueries({ queryKey: ['packages-list'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  function getActions(pkg: any) {
    const actions: Array<{ label: string; onClick: () => void; color: string }> = [];
    if (pkg.status === 'CREATED') {
      actions.push({ label: 'Pick', onClick: () => pickM.mutate(pkg.id), color: 'bg-yellow-500 hover:bg-yellow-600 text-white' });
    }
    if (pkg.status === 'PICKING') {
      actions.push({ label: 'Pack', onClick: () => packM.mutate(pkg.id), color: 'bg-blue-500 hover:bg-blue-600 text-white' });
    }
    if (pkg.status === 'PACKED') {
      actions.push({ label: 'Label', onClick: () => labelM.mutate(pkg.id), color: 'bg-indigo-500 hover:bg-indigo-600 text-white' });
    }
    if (pkg.status === 'LABELED' || pkg.status === 'PACKED') {
      actions.push({
        label: 'Sort',
        onClick: () => {
          const zone = prompt('Enter sort zone:');
          if (zone) sortM.mutate({ id: pkg.id, zone });
        },
        color: 'bg-purple-500 hover:bg-purple-600 text-white',
      });
    }
    if (pkg.status === 'SORTED') {
      actions.push({ label: 'Load', onClick: () => loadM.mutate(pkg.id), color: 'bg-cyan-500 hover:bg-cyan-600 text-white' });
    }
    return actions;
  }

  const packages: any[] = data?.packages || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages & Tracking</h1>
          <p className="text-gray-500 mt-1">Manage packages through the fulfillment pipeline</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-2">
          <input className="form-input max-w-xs" placeholder="Search tracking # or barcode..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <button type="submit" className="btn-secondary"><Search className="w-4 h-4" /></button>
        </form>
        <select className="form-input max-w-[200px]" value={centerId}
          onChange={(e) => setCenterId(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
          !statusFilter ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`} onClick={() => setStatusFilter('')}>All</button>
        {allStatuses.map(s => (
          <button key={s}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s ? 'bg-primary text-white' : statusColors[s] + ' hover:opacity-80'
            }`}
            onClick={() => setStatusFilter(s)}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {detailPkg && <PackageDetail pkg={detailPkg} onClose={() => setDetailPkg(null)} />}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No packages found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Tracking #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Barcode</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Center</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Scans</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packages.map((pkg: any) => {
                  const actions = getActions(pkg);
                  return (
                    <tr key={pkg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{pkg.trackingNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{pkg.barcode || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{pkg.fulfillmentCenter?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[pkg.status] || ''}`}>
                          {pkg.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">{pkg._count?.scans || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(pkg.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                            onClick={() => setDetailPkg(pkg)}>
                            <Eye className="w-4 h-4" />
                          </button>
                          {actions.map((a, i) => (
                            <button key={i} className={`px-2 py-1 rounded-lg text-xs font-semibold ${a.color}`}
                              onClick={a.onClick}>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Total: {data?.total || packages.length} packages
          </div>
        </div>
      )}
    </div>
  );
}
