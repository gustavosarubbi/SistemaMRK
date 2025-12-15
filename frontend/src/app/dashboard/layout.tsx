'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { DashboardProvider } from '@/contexts/dashboard-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!useAuthStore.getState().token) {
       router.push('/login');
    }
  }, [router]);

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <DashboardProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 py-6 pl-4 md:pl-6 pr-2 md:pr-4">
          {children}
        </main>
      </div>
    </DashboardProvider>
  );
}

