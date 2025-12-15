"use client"

import { useEffect, useRef } from "react";
import { X, ArrowRight, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectsSidebar, SidebarProjectType } from "@/hooks/use-projects-sidebar";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ProjectListItem } from "@/types";
import { formatDaysRemaining } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ProjectsSidebarProps {
    sidebar: ReturnType<typeof useProjectsSidebar>;
    startDate?: Date;
    endDate?: Date;
}

const getTypeLabel = (type: SidebarProjectType): string => {
    switch (type) {
        case "in_execution":
            return "Projetos em Execução";
        case "ending_soon":
            return "Projetos Finalizando";
        default:
            return "Projetos";
    }
};

export function ProjectsSidebar({ sidebar, startDate, endDate }: ProjectsSidebarProps) {
    const { isOpen, projectType, closeSidebar } = sidebar;
    const router = useRouter();
    const sidebarRef = useRef<HTMLDivElement>(null);
    
    // Fetch projects based on type
    const { data, isLoading } = useQuery<{ data: ProjectListItem[]; total: number }>({
        queryKey: ['dashboard-projects-list', projectType, startDate, endDate],
        queryFn: async () => {
            if (!projectType) return { data: [], total: 0 };
            
            const params = new URLSearchParams();
            params.append('type', projectType);
            params.append('limit', '50');
            params.append('offset', '0');
            params.append('sort_by', 'days_remaining');
            
            if (startDate) {
                params.append('start_date', startDate.toISOString().split('T')[0]);
            }
            if (endDate) {
                params.append('end_date', endDate.toISOString().split('T')[0]);
            }
            
            const res = await api.get(`/dashboard/projects-list?${params.toString()}`);
            return res.data;
        },
        enabled: isOpen && !!projectType,
    });
    
    const projects = data?.data || [];
    const total = data?.total || 0;
    
    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                closeSidebar();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeSidebar]);
    
    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                closeSidebar();
            }
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, closeSidebar]);
    
    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    
    if (!isOpen || !projectType) return null;
    
    const handleViewAll = () => {
        let url = '/dashboard/projects?';
        if (projectType === 'in_execution') {
            url += 'status=in_execution&sort=days_remaining';
        } else if (projectType === 'ending_soon') {
            url += 'status=in_execution&filter=ending_soon&sort=days_remaining';
        }
        router.push(url);
        closeSidebar();
    };
    
    return (
        <>
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
                onClick={closeSidebar}
            />
            
            {/* Sidebar */}
            <div
                ref={sidebarRef}
                className={cn(
                    "fixed right-0 top-0 h-full w-full max-w-md bg-background z-50 shadow-xl",
                    "animate-in slide-in-from-right duration-300",
                    "flex flex-col"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <CardTitle className="text-lg font-semibold">
                        {getTypeLabel(projectType)}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeSidebar}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-muted-foreground">Carregando...</div>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <p className="text-muted-foreground">Nenhum projeto encontrado</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Tente ajustar os filtros de data
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {projects.map((project) => {
                                const isUrgent = project.daysRemaining !== null && project.daysRemaining <= 7;
                                const isCritical = project.daysRemaining !== null && project.daysRemaining <= 0;
                                
                                return (
                                    <Card
                                        key={project.id}
                                        className={cn(
                                            "cursor-pointer hover:shadow-md transition-shadow",
                                            isCritical && "border-red-200 bg-red-50/50",
                                            isUrgent && !isCritical && "border-orange-200 bg-orange-50/50"
                                        )}
                                        onClick={() => {
                                            router.push(`/dashboard/projects/${encodeURIComponent(project.id)}`);
                                            closeSidebar();
                                        }}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {project.name}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {project.daysRemaining !== null
                                                                    ? formatDaysRemaining(project.daysRemaining)
                                                                    : 'Data não definida'}
                                                            </span>
                                                        </div>
                                                        <span>•</span>
                                                        <span>{project.usage_percent.toFixed(0)}% execução</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Orç: {formatCurrency(project.budget)}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    Real: {formatCurrency(project.realized)}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="border-t p-4 space-y-2">
                    <div className="text-sm text-muted-foreground text-center">
                        Mostrando {projects.length} de {total} projeto{total !== 1 ? 's' : ''}
                    </div>
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={handleViewAll}
                    >
                        Ver todos na página de projetos
                        <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </>
    );
}

