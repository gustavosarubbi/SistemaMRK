'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, LogOut } from "lucide-react";

export function Header() {
    const logout = useAuthStore(state => state.logout);
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/projects", label: "Projetos", icon: FolderKanban },
    ];

    return (
        <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="flex h-16 items-center px-4 justify-between container mx-auto">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                            M
                        </div>
                        SistemaMRK
                    </div>
                    <nav className="flex gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                        isActive 
                                            ? "bg-secondary text-secondary-foreground" 
                                            : "text-muted-foreground hover:text-primary hover:bg-secondary/50"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                     <div className="text-sm text-muted-foreground hidden md:block">
                        {/* Placeholder for user info if available later */}
                        Olá, Admin
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
