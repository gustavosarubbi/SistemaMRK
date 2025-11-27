'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FolderKanban, LogOut, Settings, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { href: '/dashboard/projects', label: 'Projetos', icon: FolderKanban },
    // Placeholder para futuras rotas
    // { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r bg-card md:flex h-screen sticky top-0 left-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            M
          </div>
          <span>SistemaMRK</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        <p className="px-2 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary border-r-4 border-primary rounded-r-none" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/30 mb-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                A
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium leading-none truncate">Administrador</p>
                <p className="text-xs text-muted-foreground truncate">admin@mrk.com</p>
            </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}

