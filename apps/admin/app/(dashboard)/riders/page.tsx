'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ridersApi, usersApi } from '../../../lib/api';
import { Bike, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RidersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRider, setSelectedRider] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['riders', statusFilter],
    queryFn: () => ridersApi.getAll({ status: statusFilter === 'ALL' ? undefined : statusFilter, page: 1, limit: 50 }).then((r) => r.data),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => usersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Rider status updated'); qc.invalidateQueries({ queryKey: ['riders'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const riders = data?.riders || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riders</h1>
          <p className="text-gray-500 mt-1">Manage delivery riders</p>
        </div>
        <div className="text-sm text-gray-500">Total: {data?.total || 0}</div>
      </div>

      <div className="flex gap-2 mb-6">
        {['ALL', 'PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedRider && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Rider Details</h2>
              <button onClick={() => setSelectedRider(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-bold">
                  {selectedRider.user?.fullName?.[0]}
                </div>
                <div>
                  <div className="font-bold text-base">{selectedRider.user?.fullName}</div>
                  <div className="text-gray-500">{selectedRider.user?.phone}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3">
                <div><span className="text-gray-500">Vehicle:</span><br /><span className="font-medium">{selectedRider.vehicleType || '—'}</span></div>
                <div><span className="text-gray-500">Plate:</span><br /><span className="font-medium">{selectedRider.vehiclePlate || '—'}</span></div>
                <div><span className="text-gray-500">Status:</span><br /><span className={`font-medium ${selectedRider.riderStatus === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}`}>{selectedRider.riderStatus}</span></div>
                <div><span className="text-gray-500">Online:</span><br /><span className={`font-medium ${selectedRider.isOnline ? 'text-green-600' : 'text-gray-500'}`}>{selectedRider.isOnline ? 'Yes' : 'No'}</span></div>
                <div><span className="text-gray-500">Deliveries:</span><br /><span className="font-medium">{selectedRider.totalDeliveries || 0}</span></div>
                <div><span className="text-gray-500">Rating:</span><br /><span className="font-medium">{selectedRider.rating?.toFixed(1) || '—'}</span></div>
                <div><span className="text-gray-500">Earnings:</span><br /><span className="font-medium">₩{(selectedRider.totalEarnings || 0).toLocaleString()}</span></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {selectedRider.riderStatus === 'PENDING' && (
                <button className="btn-primary flex-1" onClick={() => { toggleStatusMutation.mutate({ id: selectedRider.user?.id, status: true }); setSelectedRider(null); }}>
                  Approve Rider
                </button>
              )}
              <button
                className={`flex-1 ${selectedRider.user?.isActive ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => {
                  toggleStatusMutation.mutate({ id: selectedRider.user?.id, status: !selectedRider.user?.isActive });
                  setSelectedRider(null);
                }}
              >
                {selectedRider.user?.isActive ? 'Suspend' : 'Reinstate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : riders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bike className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No riders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Rider', 'Phone', 'Vehicle', 'Status', 'Online', 'Deliveries', 'Rating', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {riders.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                          {r.user?.fullName?.[0]}
                        </div>
                        <span className="font-medium">{r.user?.fullName}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-500">{r.user?.phone}</td>
                    <td className="table-td text-sm">{r.vehicleType || '—'}</td>
                    <td className="table-td">
                      <span className={`badge text-xs ${r.riderStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : r.riderStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {r.riderStatus}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`w-2 h-2 rounded-full inline-block mr-1 ${r.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {r.isOnline ? 'Online' : 'Offline'}
                    </td>
                    <td className="table-td">{r.totalDeliveries || 0}</td>
                    <td className="table-td">{r.rating?.toFixed(1) || '—'}</td>
                    <td className="table-td">
                      <button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => setSelectedRider(r)}>
                        <Eye className="w-4 h-4" />
                      </button>
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
