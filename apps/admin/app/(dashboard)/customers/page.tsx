'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../../lib/api';
import { Users, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => usersApi.getAll({ role: 'CUSTOMER', search, page: 1, limit: 50 }).then((r) => r.data),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => usersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('User status updated'); qc.invalidateQueries({ queryKey: ['customers'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const users = data?.users || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage registered customers</p>
        </div>
        <div className="text-sm text-gray-500">Total: {data?.total || 0}</div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          className="form-input max-w-xs"
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Customer Details</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold">
                  {selectedUser.fullName?.[0]}
                </div>
                <div>
                  <div className="font-bold text-base">{selectedUser.fullName}</div>
                  <div className="text-gray-500">{selectedUser.phone}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3">
                <div><span className="text-gray-500">Email:</span><br /><span className="font-medium">{selectedUser.email || '—'}</span></div>
                <div><span className="text-gray-500">Verified:</span><br /><span className={`font-medium ${selectedUser.isPhoneVerified ? 'text-green-600' : 'text-red-500'}`}>{selectedUser.isPhoneVerified ? 'Yes' : 'No'}</span></div>
                <div><span className="text-gray-500">Status:</span><br /><span className={`font-medium ${selectedUser.isActive ? 'text-green-600' : 'text-red-500'}`}>{selectedUser.isActive ? 'Active' : 'Blocked'}</span></div>
                <div><span className="text-gray-500">Wallet:</span><br /><span className="font-medium">₩{selectedUser.customer?.wallet?.balance?.toLocaleString() || 0}</span></div>
                <div><span className="text-gray-500">Orders:</span><br /><span className="font-medium">{selectedUser.customer?.orders?.length || 0}</span></div>
                <div><span className="text-gray-500">Joined:</span><br /><span className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</span></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className={`flex-1 ${selectedUser.isActive ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  toggleStatusMutation.mutate({ id: selectedUser.id, status: !selectedUser.isActive });
                  setSelectedUser((u: any) => ({ ...u, isActive: !u.isActive }));
                }}
              >
                {selectedUser.isActive ? 'Block User' : 'Unblock User'}
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
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Customer', 'Phone', 'Email', 'Wallet', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                          {u.fullName?.[0]}
                        </div>
                        <span className="font-medium">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-500">{u.phone}</td>
                    <td className="table-td text-gray-500 text-sm">{u.email || '—'}</td>
                    <td className="table-td font-medium">₩{u.customer?.wallet?.balance?.toLocaleString() || 0}</td>
                    <td className="table-td">
                      <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <button
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                        onClick={() => setSelectedUser(u)}
                      >
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
