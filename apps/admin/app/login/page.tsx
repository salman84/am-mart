'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface PublicSettings {
  APP_LOGO?: string;
  APP_NAME?: string;
  APP_TAGLINE?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>({});

  useEffect(() => {
    fetch(`${API_URL}/admin/public-settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings && Array.isArray(data.settings)) {
          const map: PublicSettings = {};
          data.settings.forEach((s: { key: string; value: string }) => {
            if (s.key === 'APP_LOGO') map.APP_LOGO = s.value;
            if (s.key === 'APP_NAME') map.APP_NAME = s.value;
            if (s.key === 'APP_TAGLINE') map.APP_TAGLINE = s.value;
          });
          setPublicSettings(map);
        } else if (data && typeof data === 'object') {
          setPublicSettings(data as PublicSettings);
        }
      })
      .catch(() => {
        // Silently ignore — fallback to defaults
      });
  }, []);

  const appName = publicSettings.APP_NAME || 'AM Mart';
  const tagline = publicSettings.APP_TAGLINE || 'Sign in to manage your store';
  const initials = appName.slice(0, 2).toUpperCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminApi.login({ identifier: username.trim(), password: password.trim() });
      const { accessToken, token, user } = res.data;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role)) {
        toast.error('Access denied. Admin only.');
        return;
      }
      localStorage.setItem('adminToken', accessToken || token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      toast.success(`Welcome back, ${user?.fullName || 'Admin'}!`);
      // Brief delay so the toast renders before navigation destroys this page
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
      router.replace('/dashboard');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col items-center mb-8">
            {publicSettings.APP_LOGO ? (
              <img
                src={publicSettings.APP_LOGO}
                alt={appName}
                className="h-14 w-auto object-contain mb-4"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
                <span className="text-white font-extrabold text-xl">{initials}</span>
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">{appName}</h1>
            <p className="text-sm text-gray-500 mt-1">{tagline}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Email or Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="admin@ammart.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
