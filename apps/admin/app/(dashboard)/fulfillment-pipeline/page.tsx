'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fulfillmentApi, warehouseApi } from '../../../lib/api';
import {
  Cog, Package, ArrowRight, Truck, CheckCircle, XCircle,
  Play, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const pipelineSteps = [
  { key: 'created', label: 'Created', icon: Package, color: '#6B7280' },
  { key: 'picking', label: 'Picking', icon: Package, color: '#F59E0B' },
  { key: 'packed', label: 'Packed', icon: Package, color: '#3B82F6' },
  { key: 'labeled', label: 'Labeled', icon: Package, color: '#6366F1' },
  { key: 'sorted', label: 'Sorted', icon: Package, color: '#8B5CF6' },
  { key: 'scannedOut', label: 'Scanned Out', icon: Truck, color: '#06B6D4' },
  { key: 'inTransit', label: 'In Transit', icon: Truck, color: '#F97316' },
  { key: 'outForDelivery', label: 'Out For Delivery', icon: Truck, color: '#EAB308' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: '#10B981' },
  { key: 'failed', label: 'Failed', icon: XCircle, color: '#EF4444' },
];

export default function FulfillmentPipelinePage() {
  const qc = useQueryClient();
  const [centerId, setCenterId] = useState('');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [routeCreateDate, setRouteCreateDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: centersData } = useQuery({
    queryKey: ['fc-list'],
    queryFn: () => warehouseApi.getCenters({ limit: 100 }).then(r => r.data),
  });
  const centers: any[] = centersData?.centers || [];

  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['fulfillment-pipeline', centerId],
    queryFn: () => fulfillmentApi.getPipeline(centerId || undefined).then(r => r.data),
    refetchInterval: 30000,
  });

  const processOrderM = useMutation({
    mutationFn: (orderId: string) => fulfillmentApi.processOrder(orderId),
    onSuccess: (res) => {
      toast.success(`Order processed → ${res.data.trackingNumber}`);
      qc.invalidateQueries({ queryKey: ['fulfillment-pipeline'] });
      setOrderIdInput('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to process order'),
  });

  const autoRouteM = useMutation({
    mutationFn: () => fulfillmentApi.autoCreateRoute(centerId, routeCreateDate),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['fulfillment-pipeline'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const pipeline = pipelineData?.pipeline;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fulfillment Engine</h1>
          <p className="text-gray-500 mt-1">Order → Warehouse → Driver automation pipeline</p>
        </div>
        <button className="btn-secondary flex items-center gap-2"
          onClick={() => qc.invalidateQueries({ queryKey: ['fulfillment-pipeline'] })}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Center Filter */}
      <div className="mb-4">
        <select className="form-input max-w-xs" value={centerId}
          onChange={(e) => setCenterId(e.target.value)}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      {/* Pipeline Visualization */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 animate-pulse">
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      ) : pipeline && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Pipeline Status (Total: {pipeline.total})</h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {pipelineSteps.map((step, i) => {
              const count = pipeline[step.key] || 0;
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[90px]">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${step.color}15` }}>
                      <span className="text-lg font-bold" style={{ color: step.color }}>{count}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{step.label}</span>
                  </div>
                  {i < pipelineSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mx-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Process Order */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-1">Process Order for Fulfillment</h3>
          <p className="text-sm text-gray-500 mb-4">
            Send an order to the warehouse: reserve inventory → create shipment → create package → enter pick queue
          </p>
          <div className="flex gap-2">
            <input className="form-input flex-1" placeholder="Enter Order ID..."
              value={orderIdInput} onChange={(e) => setOrderIdInput(e.target.value)} />
            <button className="btn-primary flex items-center gap-2"
              disabled={!orderIdInput.trim() || processOrderM.isPending}
              onClick={() => processOrderM.mutate(orderIdInput.trim())}>
              {processOrderM.isPending ? 'Processing...' : <><Play className="w-4 h-4" /> Process</>}
            </button>
          </div>
        </div>

        {/* Auto Create Route */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-1">Auto-Create Delivery Route</h3>
          <p className="text-sm text-gray-500 mb-4">
            Automatically group ready packages into a delivery route with stops
          </p>
          <div className="flex gap-2">
            {centerId ? (
              <>
                <input className="form-input flex-1" type="date" value={routeCreateDate}
                  onChange={(e) => setRouteCreateDate(e.target.value)} />
                <button className="btn-primary flex items-center gap-2"
                  disabled={autoRouteM.isPending}
                  onClick={() => autoRouteM.mutate()}>
                  {autoRouteM.isPending ? 'Creating...' : <><Cog className="w-4 h-4" /> Create Route</>}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">Select a center above first</p>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 mt-6">
        <h3 className="font-bold text-gray-900 mb-3">How the Fulfillment Engine Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="space-y-2">
            <p><strong>1.</strong> Customer places order &amp; payment confirmed</p>
            <p><strong>2.</strong> System finds nearest warehouse with inventory</p>
            <p><strong>3.</strong> Inventory is reserved (prevents overselling)</p>
            <p><strong>4.</strong> Shipment + Package auto-created with tracking #</p>
            <p><strong>5.</strong> Package enters warehouse pick queue</p>
          </div>
          <div className="space-y-2">
            <p><strong>6.</strong> Warehouse staff picks → packs → labels</p>
            <p><strong>7.</strong> Packages sorted by delivery zone</p>
            <p><strong>8.</strong> Auto-create route from ready packages</p>
            <p><strong>9.</strong> Auto-assign best driver to route</p>
            <p><strong>10.</strong> Driver delivers → proof → inventory deducted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
