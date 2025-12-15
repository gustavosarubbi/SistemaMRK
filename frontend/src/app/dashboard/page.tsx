'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { AlertsBadge } from '@/components/dashboard/alerts-badge';
import { DashboardExportButton } from '@/components/dashboard/dashboard-export-button';
import { ProjectsSidebar } from '@/components/dashboard/projects-sidebar';
import { useProjectsSidebar } from '@/hooks/use-projects-sidebar';
import { useDashboardFilters } from '@/hooks/use-dashboard-filters';
import { useDashboardSummary } from '@/hooks/use-dashboard-data';
import { OverviewSection } from '@/components/dashboard/sections/overview-section';

export default function DashboardPage() {
    const [projectsLimit, setProjectsLimit] = useState<number>(5);
    
    const sidebar = useProjectsSidebar();
    const filters = useDashboardFilters();
    const { data, refetch } = useDashboardSummary();
    
    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);
    
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
                <PageHeader
                    title="Visão Geral"
                    description="Monitore o desempenho e atividade do sistema"
                    breadcrumbItems={[{ label: 'Visão Geral' }]}
                />
                
                <div className="flex items-center gap-2">
                    <AlertsBadge data={data} />
                    <DashboardExportButton data={data} />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        title="Atualizar dados"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Overview Section */}
            <div className="space-y-4">
                <OverviewSection 
                    projectsLimit={projectsLimit}
                    onProjectsLimitChange={setProjectsLimit}
                />
            </div>
            
            {/* Sidebar */}
            <ProjectsSidebar 
                sidebar={sidebar}
                startDate={filters.startDate}
                endDate={filters.endDate}
            />
        </div>
    );
}
