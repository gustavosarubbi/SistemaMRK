'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!useAuthStore.getState().token) {
       router.push('/login');
    }
  }, [router]);

  if (!mounted) return null; 

  return (
    <div className="min-h-screen flex bg-gray-50/50">
      {/* Sidebar visível apenas em Desktop */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header antigo mantido apenas para Mobile por enquanto */}
        <div className="md:hidden">
          <Header />
        </div>
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
          <div className="mx-auto max-w-6xl space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
