'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Bike, Shield, Calendar } from 'lucide-react';
import { useLanguage } from '../../../lib/useLanguage';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ProfilePage() {
  const { t } = useLanguage();
  const [cms, setCms] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const c = (key: string, fallback: string) => cms[key] || fallback;

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => { if (data && typeof data === 'object') setCms(data); })
      .catch(() => {});

    api.get('/riders/profile')
      .then((res) => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full" />
            <div>
              <div className="h-6 w-40 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-56 bg-gray-50 rounded" />
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const user = profile?.user || profile;
  const rider = profile?.rider || profile;
  const statusColor: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  const statusLabel: Record<string, string> = {
    APPROVED: t.approved,
    PENDING: t.pending,
    REJECTED: t.rejected,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{c('RDP_RIDER_PROFILE', t.riderProfileTitle)}</h1>
        <p className="text-gray-500 mt-1">{c('RDP_RIDER_PROFILE_SUBTITLE', t.riderProfileSubtitle)}</p>
      </div>

      <div className="space-y-6">
        {/* Profile header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
              <User className="w-10 h-10 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user?.fullName || user?.name || '—'}
              </h2>
              <p className="text-gray-500 text-sm">{user?.email || '—'}</p>
              <div className="mt-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  statusColor[rider?.status] || 'bg-gray-100 text-gray-600'
                }`}>
                  {statusLabel[rider?.status] || rider?.status || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{c('RDP_PERSONAL_INFO', t.personalInfo)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{c('RDP_FULL_NAME', t.fullName)}</div>
                <div className="text-sm font-semibold text-gray-900">{user?.fullName || user?.name || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{c('RDP_EMAIL', t.email)}</div>
                <div className="text-sm font-semibold text-gray-900">{user?.email || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{c('RDP_PHONE', t.phone)}</div>
                <div className="text-sm font-semibold text-gray-900">{user?.phone || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{c('RDP_MEMBER_SINCE', t.memberSince)}</div>
                <div className="text-sm font-semibold text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{c('RDP_VEHICLE_INFO', t.vehicleInfo)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Bike className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{c('RDP_VEHICLE_TYPE', t.vehicleType)}</div>
                <div className="text-sm font-semibold text-gray-900">{rider?.vehicleType || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{c('RDP_LICENSE_PLATE', t.licensePlate)}</div>
                <div className="text-sm font-semibold text-gray-900">{rider?.licensePlate || rider?.vehiclePlate || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
