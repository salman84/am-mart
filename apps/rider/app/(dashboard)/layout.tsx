'use client';

import { Sidebar } from '../../components/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('riderToken');
    if (!token) {
      router.replace('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
