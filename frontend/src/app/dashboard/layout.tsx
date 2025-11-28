'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!useAuthStore.getState().token) {
       router.push('/login');
    }
  }, [router]);

  if (!mounted) return null; 

  return (
    <div className="min-h-screen flex bg-gray-50/50">
      {/* Overlay para fechar sidebar ao clicar fora */}
      {sidebarOpen && (
        <div 
          className="hidden md:block fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSidebarOpen(false);
          }}
        />
      )}
      
      {/* Sidebar visível apenas em Desktop - agora é overlay */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header antigo mantido apenas para Mobile por enquanto */}
        <div className="md:hidden">
          <Header />
        </div>
        
        {/* Botão para abrir sidebar em Desktop - aparece imediatamente quando sidebar fecha */}
        <div 
          className={cn(
            "hidden md:block fixed top-4 left-4 z-50 transition-opacity duration-150",
            sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="shadow-md bg-background"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen w-full overflow-x-visible">
          <div className="mx-auto max-w-6xl space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
