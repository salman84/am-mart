'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubsApi, warehouseApi } from '../../../lib/api';
import { Layers, Plus, Pencil, Trash2, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const ZONE_TYPES = ['GENERAL', 'COLD_STORAGE', 'FRAGILE', 'OVERSIZED', 'HAZARDOUS', 'HIGH_VALUE', 'RETURNS'];
const zoneTypeColors: Record<string, string> = {
  GENERAL: 'bg-blue-100 text-blue-700',
  COLD_STORAGE: 'bg-cyan-100 text-cyan-700',
  FRAGILE: 'bg-amber-100 text-amber-700',
  OVERSIZED: 'bg-purple-100 text-purple-700',
  HAZARDOUS: 'bg-red-100 text-red-700',
  HIGH_VALUE: 'bg-emerald-100 text-emerald-700',
  RETURNS: 'bg-orange-100 text-orange-700',
};

export default function WarehouseZonesPage() {
  const qc = useQueryClient();
  const [centerId, setCenterId] = useState('');
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  // Zone form
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [zoneForm, setZoneForm] = useState({ name: '', code: '', zoneType: 'GENERAL', description: '', temperatureControl: false, sortOrder: 0 });

  // Rack form
  const [showRackModal, setShowRackModal] = useState(false);
  const [rackZoneId, setRackZoneId] = useState('');
  const [editingRack, setEditingRack] = useState<any>(null);
  const [rackForm, setRackForm] = useState({ rackCode: '', shelves: 5, binsPerShelf: 10 });

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data: zonesData, isLoading } = useQuery({
    queryKey: ['wh-zones', centerId],
    queryFn: () => centerId ? hubsApi.getZones(centerId).then(r => r.data) : Promise.resolve({ zones: [] }),
    enabled: !!centerId,
  });

  // Racks for expanded zone
  const { data: racksData } = useQuery({
    queryKey: ['wh-racks', expandedZone],
    queryFn: () => expandedZone ? hubsApi.getRacks(expandedZone).then(r => r.data) : Promise.resolve({ racks: [] }),
    enabled: !!expandedZone,
  });

  // Zone mutations
  const createZoneM = useMutation({
    mutationFn: (d: any) => hubsApi.createZone(centerId, d),
    onSuccess: () => { toast.success('Zone created'); qc.invalidateQueries({ queryKey: ['wh-zones'] }); setShowZoneModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateZoneM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => hubsApi.updateZone(id, d),
    onSuccess: () => { toast.success('Zone updated'); qc.invalidateQueries({ queryKey: ['wh-zones'] }); setShowZoneModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteZoneM = useMutation({
    mutationFn: (id: string) => hubsApi.deleteZone(id),
    onSuccess: () => { toast.success('Zone deleted'); qc.invalidateQueries({ queryKey: ['wh-zones'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // Rack mutations
  const createRackM = useMutation({
    mutationFn: (d: any) => hubsApi.createRack(rackZoneId, d),
    onSuccess: () => { toast.success('Rack created'); qc.invalidateQueries({ queryKey: ['wh-racks'] }); setShowRackModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const updateRackM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => hubsApi.updateRack(id, d),
    onSuccess: () => { toast.success('Rack updated'); qc.invalidateQueries({ queryKey: ['wh-racks'] }); setShowRackModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteRackM = useMutation({
    mutationFn: (id: string) => hubsApi.deleteRack(id),
    onSuccess: () => { toast.success('Rack deleted'); qc.invalidateQueries({ queryKey: ['wh-racks'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const zones: any[] = zonesData?.zones || [];
  const racks: any[] = racksData?.racks || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Zones & Racks</h1>
          <p className="text-gray-500 mt-1">Zone → Rack → Shelf → Bin hierarchy</p>
        </div>
        {centerId && (
          <button className="btn-primary flex items-center gap-2" onClick={() => {
            setEditingZone(null);
            setZoneForm({ name: '', code: '', zoneType: 'GENERAL', description: '', temperatureControl: false, sortOrder: 0 });
            setShowZoneModal(true);
          }}>
            <Plus className="w-4 h-4" /> Add Zone
          </button>
        )}
      </div>

      <div className="mb-4">
        <select className="form-input max-w-xs" value={centerId}
          onChange={(e) => { setCenterId(e.target.value); setExpandedZone(null); }}>
          <option value="">Select Fulfillment Center</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">{editingZone ? 'Edit Zone' : 'Add Zone'}</h2>
              <button onClick={() => setShowZoneModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingZone) updateZoneM.mutate({ id: editingZone.id, d: zoneForm });
              else createZoneM.mutate(zoneForm);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Zone Name *</label>
                  <input className="form-input" required value={zoneForm.name} onChange={(e) => setZoneForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Zone A" /></div>
                <div><label className="form-label">Code *</label>
                  <input className="form-input" required value={zoneForm.code} onChange={(e) => setZoneForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. A" /></div>
              </div>
              <div><label className="form-label">Type</label>
                <select className="form-input" value={zoneForm.zoneType} onChange={(e) => setZoneForm(f => ({ ...f, zoneType: e.target.value }))}>
                  {ZONE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select></div>
              <div><label className="form-label">Description</label>
                <input className="form-input" value={zoneForm.description} onChange={(e) => setZoneForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setZoneForm(f => ({ ...f, temperatureControl: !f.temperatureControl }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${zoneForm.temperatureControl ? 'bg-cyan-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${zoneForm.temperatureControl ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <label className="text-sm font-medium text-gray-700">Temperature Controlled</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowZoneModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={createZoneM.isPending || updateZoneM.isPending}>
                  {(createZoneM.isPending || updateZoneM.isPending) ? 'Saving...' : editingZone ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rack Modal */}
      {showRackModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">{editingRack ? 'Edit Rack' : 'Add Rack'}</h2>
              <button onClick={() => setShowRackModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingRack) updateRackM.mutate({ id: editingRack.id, d: rackForm });
              else createRackM.mutate(rackForm);
            }} className="space-y-4">
              <div><label className="form-label">Rack Code *</label>
                <input className="form-input" required value={rackForm.rackCode} onChange={(e) => setRackForm(f => ({ ...f, rackCode: e.target.value }))} placeholder="e.g. R01" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Shelves</label>
                  <input className="form-input" type="number" min={1} value={rackForm.shelves} onChange={(e) => setRackForm(f => ({ ...f, shelves: Number(e.target.value) }))} /></div>
                <div><label className="form-label">Bins/Shelf</label>
                  <input className="form-input" type="number" min={1} value={rackForm.binsPerShelf} onChange={(e) => setRackForm(f => ({ ...f, binsPerShelf: Number(e.target.value) }))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowRackModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={createRackM.isPending || updateRackM.isPending}>
                  {(createRackM.isPending || updateRackM.isPending) ? 'Saving...' : editingRack ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!centerId ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a fulfillment center to manage zones</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded" />)}</div>
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center py-16 text-gray-400">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">No zones in this center</p>
          <button className="btn-primary" onClick={() => {
            setEditingZone(null);
            setZoneForm({ name: '', code: '', zoneType: 'GENERAL', description: '', temperatureControl: false, sortOrder: 0 });
            setShowZoneModal(true);
          }}>Add First Zone</button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone: any) => (
            <div key={zone.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Zone Header */}
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedZone === zone.id ? 'rotate-90' : ''}`} />
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-sm">{zone.code}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                  {zone.description && <p className="text-xs text-gray-500">{zone.description}</p>}
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${zoneTypeColors[zone.zoneType] || 'bg-gray-100 text-gray-600'}`}>
                  {zone.zoneType?.replace(/_/g, ' ')}
                </span>
                {zone.temperatureControl && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">Temp Control</span>
                )}
                <span className="text-sm text-gray-500">{zone._count?.racks || 0} racks</span>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={(e) => {
                    e.stopPropagation();
                    setEditingZone(zone);
                    setZoneForm({ name: zone.name, code: zone.code, zoneType: zone.zoneType || 'GENERAL', description: zone.description || '', temperatureControl: zone.temperatureControl || false, sortOrder: zone.sortOrder || 0 });
                    setShowZoneModal(true);
                  }}><Pencil className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete zone "${zone.name}"?`)) deleteZoneM.mutate(zone.id);
                  }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Expanded Racks */}
              {expandedZone === zone.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-600">Racks in {zone.name}</h4>
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      onClick={() => {
                        setRackZoneId(zone.id);
                        setEditingRack(null);
                        setRackForm({ rackCode: '', shelves: 5, binsPerShelf: 10 });
                        setShowRackModal(true);
                      }}>
                      <Plus className="w-3 h-3" /> Add Rack
                    </button>
                  </div>
                  {racks.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No racks in this zone</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {racks.map((rack: any) => (
                        <div key={rack.id} className="bg-white rounded-lg border border-gray-200 p-3 text-center group relative">
                          <div className="text-lg font-bold text-gray-900">{rack.rackCode}</div>
                          <div className="text-xs text-gray-500">{rack.shelves} shelves × {rack.binsPerShelf} bins</div>
                          <div className="text-xs text-gray-400">{rack.shelves * rack.binsPerShelf} total slots</div>
                          <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                            <button className="p-1 rounded hover:bg-blue-50 text-blue-500" onClick={() => {
                              setRackZoneId(zone.id);
                              setEditingRack(rack);
                              setRackForm({ rackCode: rack.rackCode, shelves: rack.shelves, binsPerShelf: rack.binsPerShelf });
                              setShowRackModal(true);
                            }}><Pencil className="w-3 h-3" /></button>
                            <button className="p-1 rounded hover:bg-red-50 text-red-500" onClick={() => {
                              if (confirm(`Delete rack "${rack.rackCode}"?`)) deleteRackM.mutate(rack.id);
                            }}><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
