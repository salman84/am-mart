'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../../lib/api';

const ROLES = ['CUSTOMER', 'SELLER', 'RIDER', 'ADMIN', 'SUPER_ADMIN'];
const STATUSES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', email: '', role: 'ADMIN' });

  const { data, isLoading } = useQuery({
    queryKey: ['users-admin', search, role],
    queryFn: () => usersApi.getAll({ search, role: role || undefined, page: 1, limit: 100 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ ...form, email: form.email || undefined }),
    onSuccess: () => {
      toast.success('User created');
      setShowCreate(false);
      setForm({ username: '', password: '', email: '', role: 'ADMIN' });
      qc.invalidateQueries({ queryKey: ['users-admin'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create user'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => usersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['users-admin'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update user'),
  });

  const users = data?.users || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
          <p className="text-gray-500 mt-1">Create users and manage role-based access</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          className="form-input max-w-xs"
          placeholder="Search username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-input max-w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold">Create User</h2>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <div>
                <label className="form-label">Username</label>
                <input className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Admin" required />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Admin@123" required />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Email Optional</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@ammart.com" />
              </div>
              <button className="btn-primary w-full py-3" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </form>
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
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Username', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => <th key={h} className="table-th">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="table-td font-semibold">{u.fullName}</td>
                    <td className="table-td text-gray-500">{u.email || '-'}</td>
                    <td className="table-td"><span className="badge bg-primary/10 text-primary">{u.role}</span></td>
                    <td className="table-td"><span className={`badge ${STATUSES[u.status] || 'bg-gray-100 text-gray-700'}`}>{u.status}</span></td>
                    <td className="table-td text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <button
                        className={u.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}
                        onClick={() => statusMutation.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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
