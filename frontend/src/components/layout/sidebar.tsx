'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FolderKanban, LogOut, PlusCircle, ShieldCheck, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useCallback, memo, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/dashboard/faturamento', label: 'Faturamento', icon: LayoutDashboard },
  { href: '/dashboard/validation', label: 'Validação', icon: ShieldCheck },
  { href: '/dashboard/auditoria', label: 'Auditoria', icon: ShieldCheck },
] as const;

const actionItems = [
  { href: '/dashboard/projects/new', label: 'Novo Projeto', icon: PlusCircle },
] as const;

// Componente memoizado para itens de navegação
const NavItem = memo(function NavItem({
  href,
  label,
  Icon,
  isActive,
  isVisible,
  onClick,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isVisible: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 group",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className={cn("whitespace-nowrap", !isVisible && "hidden")}>{label}</span>
    </Link>
  );
});

NavItem.displayName = 'NavItem';

export const Sidebar = memo(function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [isHovered, setIsHovered] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const sidebarOpen = useMemo(() => isOpen || isHovered, [isOpen, isHovered]);

  // Memoizar classes CSS para evitar recálculos
  const asideClasses = useMemo(() => cn(
    "hidden md:flex flex-col border-r bg-card h-screen fixed top-0 left-0 overflow-hidden shadow-lg z-40",
    "transition-transform duration-150 ease-out",
    sidebarOpen ? "translate-x-0" : "-translate-x-full"
  ), [sidebarOpen]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!isOpen) {
      setIsHovered(false);
    }
  }, [isOpen]);

  const handleLinkClick = useCallback(() => {
    if (onClose && isOpen) {
      onClose();
    }
    setIsHovered(false);
  }, [onClose, isOpen]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  const handleStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Memoizar itens de navegação para evitar re-renders
  const navItemsMemo = useMemo(() =>
    navItems.map((item) => ({
      ...item,
      isActive: pathname === item.href,
    })),
    [pathname]
  );

  const actionItemsMemo = useMemo(() =>
    actionItems.map((item) => ({
      ...item,
      isActive: pathname === item.href,
    })),
    [pathname]
  );

  return (
    <aside
      ref={sidebarRef}
      className={asideClasses}
      style={{ width: '256px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleStopPropagation}
    >
      <div className={cn(
        "p-6 border-b overflow-hidden relative transition-opacity duration-150",
        !sidebarOpen && "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 font-bold text-xl text-primary">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
              M
            </div>
            <span className={cn("tracking-tight whitespace-nowrap", !sidebarOpen && "hidden")}>
              SistemaMRK
            </span>
          </div>
          {isOpen && onClose && sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 shrink-0 z-50"
              aria-label="Fechar sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div className="flex-1 flex flex-col gap-6 p-4 overflow-hidden">
          <nav className="space-y-1">
            <p className={cn(
              "px-2 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider",
              !sidebarOpen && "hidden"
            )}>
              Menu Principal
            </p>
            {navItemsMemo.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                isActive={item.isActive}
                isVisible={sidebarOpen}
                onClick={handleLinkClick}
              />
            ))}
          </nav>

          <nav className="space-y-1">
            <p className={cn(
              "px-2 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider",
              !sidebarOpen && "hidden"
            )}>
              Ações Rápidas
            </p>
            {actionItemsMemo.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                isActive={item.isActive}
                isVisible={sidebarOpen}
                onClick={handleLinkClick}
              />
            ))}
          </nav>
        </div>
      )}

      {sidebarOpen && (
        <div className="p-4 border-t bg-muted/10 overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg border bg-background mb-3 shadow-sm">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/10 shrink-0">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium leading-none truncate text-foreground">
                Administrador
              </p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                admin@mrk.com
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-150 border border-transparent hover:border-destructive/20"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Sair do Sistema</span>
          </button>
        </div>
      )}
    </aside>
  );
});
