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
import { useDashboardProgress } from '@/hooks/use-dashboard-progress';
import { OverviewSection } from '@/components/dashboard/sections/overview-section';
import { LoadingProgress } from '@/components/ui/loading-progress';

export default function DashboardPage() {
    const [projectsLimit, setProjectsLimit] = useState<number>(5);

    const sidebar = useProjectsSidebar();
    const filters = useDashboardFilters();
    const { data, isLoading, projectsLoading, progress, refetch } = useDashboardProgress();

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    // Show full loading screen only on initial load when there is absolutely no data
    if (isLoading && !data) {
        return <LoadingProgress progress={progress} />;
    }

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
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Overview Section */}
            <div className="space-y-4">
                <OverviewSection
                    projectsLimit={projectsLimit}
                    onProjectsLimitChange={setProjectsLimit}
                    data={data}
                    isLoading={isLoading}
                    projectsLoading={projectsLoading}
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
