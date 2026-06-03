'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../../lib/api';
import {
  Activity, Package, Truck, Users, Warehouse, AlertTriangle,
  CheckCircle, XCircle, TrendingUp, Clock,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  CREATED: '#6B7280', PICKING: '#F59E0B', PACKED: '#3B82F6',
  LABELED: '#6366F1', SORTED: '#8B5CF6', SCANNED_OUT: '#06B6D4',
  IN_TRANSIT: '#F97316', OUT_FOR_DELIVERY: '#EAB308',
  DELIVERED: '#10B981', DELIVERY_FAILED: '#EF4444',
  RETURNED: '#EC4899', DAMAGED: '#DC2626', LOST: '#374151',
};

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}
        style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function StatusBar({ status, count, total }: { status: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = statusColors[status] || '#6B7280';
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-32 text-gray-600 truncate">{status.replace(/_/g, ' ')}</div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-10 text-right font-semibold text-gray-700">{count}</div>
      <div className="w-10 text-right text-gray-400">{pct}%</div>
    </div>
  );
}

export default function ParcelAnalyticsPage() {
  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.getParcelOverview().then(r => r.data),
  });

  const { data: statusData } = useQuery({
    queryKey: ['analytics-status'],
    queryFn: () => analyticsApi.getPackageStatus().then(r => r.data),
  });

  const { data: driverData } = useQuery({
    queryKey: ['analytics-drivers'],
    queryFn: () => analyticsApi.getDriverPerformance({ limit: '10' }).then(r => r.data),
  });

  const { data: warehouseData } = useQuery({
    queryKey: ['analytics-warehouse'],
    queryFn: () => analyticsApi.getWarehousePerformance().then(r => r.data),
  });

  const { data: failedData } = useQuery({
    queryKey: ['analytics-failed'],
    queryFn: () => analyticsApi.getFailedDeliveries('30').then(r => r.data),
  });

  const o = overviewData?.overview;
  const breakdown = statusData?.breakdown || [];
  const totalPkgs = breakdown.reduce((s: number, b: any) => s + b.count, 0);
  const drivers = driverData?.drivers || [];
  const centers = warehouseData?.centers || [];
  const failedAnalysis = failedData?.analysis;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parcel Delivery Analytics</h1>
        <p className="text-gray-500 mt-1">Real-time monitoring of the parcel delivery system</p>
      </div>

      {loadingOverview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : o && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Package} label="Total Packages" value={o.totalPackages?.toLocaleString()} color="#3B82F6" sub={`${o.packagesToday} today`} />
            <StatCard icon={CheckCircle} label="Delivered" value={o.deliveredTotal?.toLocaleString()} color="#10B981" sub={`${o.deliveredToday} today`} />
            <StatCard icon={XCircle} label="Failed" value={o.failedTotal} color="#EF4444" sub={`${o.failedToday} today`} />
            <StatCard icon={TrendingUp} label="Delivery Rate" value={`${o.deliveryRate}%`} color="#8B5CF6" />
            <StatCard icon={Truck} label="In Transit" value={o.inTransit} color="#F97316" sub={`${o.outForDelivery} out for delivery`} />
            <StatCard icon={Activity} label="Active Routes" value={o.activeRoutes} color="#06B6D4" sub={`${o.totalRoutes} total`} />
            <StatCard icon={Users} label="Online Drivers" value={o.onlineDrivers} color="#10B981" sub={`${o.totalDrivers} total`} />
            <StatCard icon={Warehouse} label="Active Centers" value={o.totalCenters} color="#6366F1" />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Package Status Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Package Status Breakdown</h3>
          {breakdown.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No data</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map((b: any) => (
                <StatusBar key={b.status} status={b.status} count={b.count} total={totalPkgs} />
              ))}
            </div>
          )}
        </div>

        {/* Failed Delivery Reasons */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            Failed Delivery Reasons <span className="text-gray-400 font-normal text-sm">(last 30 days)</span>
          </h3>
          {!failedAnalysis || failedAnalysis.total === 0 ? (
            <p className="text-gray-400 text-center py-8">No failed deliveries</p>
          ) : (
            <div className="space-y-3">
              {failedAnalysis.byReason.map((r: any) => (
                <div key={r.reason} className="flex items-center gap-3 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="flex-1 text-gray-600">{r.reason.replace(/_/g, ' ')}</div>
                  <div className="font-semibold text-gray-700">{r.count}</div>
                  <div className="text-gray-400 w-10 text-right">{r.percentage}%</div>
                </div>
              ))}
              <div className="pt-2 border-t text-sm text-gray-500">
                Total: {failedAnalysis.total} failed deliveries
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Drivers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Top Drivers</h3>
          {drivers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No drivers</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase">
                    <th className="text-left py-2">Driver</th>
                    <th className="text-center py-2">Deliveries</th>
                    <th className="text-center py-2">Rating</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drivers.map((d: any) => (
                    <tr key={d.id}>
                      <td className="py-2 font-semibold text-gray-900">{d.name || 'Unknown'}</td>
                      <td className="py-2 text-center">{d.totalDeliveries}</td>
                      <td className="py-2 text-center">
                        <span className="text-yellow-500">★</span> {d.rating?.toFixed(1) || '—'}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`inline-flex w-2 h-2 rounded-full ${d.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Warehouse Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Warehouse Capacity</h3>
          {centers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No centers</p>
          ) : (
            <div className="space-y-4">
              {centers.map((c: any) => (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    <span className="text-gray-500">{c.occupancy?.toLocaleString()}/{c.capacity?.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      c.occupancyPercent > 90 ? 'bg-red-500' :
                      c.occupancyPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} style={{ width: `${c.occupancyPercent}%` }} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    <span>{c.totalBins} bins</span>
                    <span>{c.totalPackages} packages</span>
                    <span>{c.totalRoutes} routes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
