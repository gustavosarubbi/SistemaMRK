'use client';

import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DashboardData, TimeRangePreset } from '@/types';
import { format } from "date-fns";
import { KPICards } from '@/components/dashboard/kpi-cards';
import { TopProjectsBarChart } from '@/components/dashboard/charts/top-projects-bar-chart';
import { BudgetTrendLineChart } from '@/components/dashboard/charts/budget-trend-line-chart';
import { StatusDistributionChart } from '@/components/dashboard/charts/status-distribution-chart';
import { ExecutionPercentChart } from '@/components/dashboard/charts/execution-percent-chart';
import { ProjectsTimelineChart } from '@/components/dashboard/charts/projects-timeline-chart';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectsInExecutionCard } from '@/components/dashboard/projects-in-execution-card';
import { ProjectsEndingSoonCard } from '@/components/dashboard/projects-ending-soon-card';
import { ProjectsSidebar } from '@/components/dashboard/projects-sidebar';
import { useProjectsSidebar } from '@/hooks/use-projects-sidebar';
import { AlertsBadge } from '@/components/dashboard/alerts-badge';
import { DashboardExportButton } from '@/components/dashboard/dashboard-export-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { getDateRangeForPreset } from '@/lib/date-presets';

// Lazy load heavy components
const ProjectsLimitSelector = lazy(() => 
    import('@/components/dashboard/projects-limit-selector').then(module => ({ 
        default: module.ProjectsLimitSelector 
    }))
);

export default function DashboardPage() {
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(2023, 0, 1));
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [timeRange, setTimeRange] = useState<TimeRangePreset>('custom');
    const [projectsLimit, setProjectsLimit] = useState<number>(5);
    
    const sidebar = useProjectsSidebar();

    const { data, isLoading, error, refetch } = useQuery<DashboardData>({
        queryKey: ['dashboard-summary', startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
            if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
            const res = await api.get(`/dashboard/summary?${params.toString()}`);
            return res.data;
        },
        staleTime: 30000, // 30 seconds
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const handleTimeRangeChange = useCallback((range: TimeRangePreset) => {
        setTimeRange(range);
        const { startDate: newStartDate, endDate: newEndDate } = getDateRangeForPreset(range);
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    }, []);

    const clearFilters = useCallback(() => {
        setStartDate(undefined);
        setEndDate(undefined);
        setTimeRange('custom');
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-md"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-32 bg-muted animate-pulse rounded mt-2"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="h-[300px] w-full bg-muted animate-pulse rounded-lg"></div>
            </div>
        );
    }

    if (error || !data) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center space-y-2">
                <div className="text-destructive font-medium">Erro ao carregar dados</div>
                <p className="text-muted-foreground text-sm">Verifique sua conexão e tente novamente.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                    Tentar novamente
                </Button>
            </div>
        </div>
    );
    
    const { kpis, charts, status_stats, projects_in_execution, projects_ending_soon } = data;
    
    // Memoize projects lists with limit
    const limitedProjectsInExecution = useMemo(() => {
        if (!projects_in_execution) return [];
        return projectsLimit === -1 
            ? projects_in_execution 
            : projects_in_execution.slice(0, projectsLimit);
    }, [projects_in_execution, projectsLimit]);
    
    const limitedProjectsEndingSoon = useMemo(() => {
        if (!projects_ending_soon) return [];
        return projectsLimit === -1 
            ? projects_ending_soon 
            : projects_ending_soon.slice(0, projectsLimit);
    }, [projects_ending_soon, projectsLimit]);

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
                        onClick={() => refetch()}
                        title="Atualizar dados"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <DashboardFilters 
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        clearFilters={clearFilters}
                        timeRange={timeRange}
                        onTimeRangeChange={handleTimeRangeChange}
                    />
                </div>
            </div>

            {/* KPIs */}
            <KPICards kpis={kpis} />
            
            {/* Project Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <ProjectsInExecutionCard
                    count={kpis.in_execution || 0}
                    projects={limitedProjectsInExecution}
                    limit={projectsLimit}
                    onViewAll={() => sidebar.openSidebar('in_execution')}
                />
                <ProjectsEndingSoonCard
                    count={kpis.ending_soon || 0}
                    projects={limitedProjectsEndingSoon}
                    limit={projectsLimit}
                    onViewAll={() => sidebar.openSidebar('ending_soon')}
                />
            </div>
            
            {/* Limit Selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mostrar:</span>
                <Suspense fallback={<div className="h-9 w-[120px] bg-muted animate-pulse rounded" />}>
                    <ProjectsLimitSelector onLimitChange={setProjectsLimit} />
                </Suspense>
            </div>
            
            {/* Tabs with Charts */}
            <DashboardTabsContent 
                charts={charts}
                status_stats={status_stats}
            />
            
            {/* Sidebar */}
            <ProjectsSidebar 
                sidebar={sidebar}
                startDate={startDate}
                endDate={endDate}
            />
        </div>
    );
}

// Separate component for tabs to manage state
function DashboardTabsContent({ 
    charts, 
    status_stats 
}: { 
    charts: DashboardData['charts'];
    status_stats?: DashboardData['status_stats'];
}) {
    const [activeTab, setActiveTab] = useState('overview');
    
    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="status">Status dos Projetos</TabsTrigger>
                <TabsTrigger value="trends">Tendências</TabsTrigger>
            </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        <TopProjectsBarChart data={charts.top_projects} />
                        <StatusDistributionChart data={charts.status_distribution} />
                    </div>
                </TabsContent>
                
                <TabsContent value="status" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        <StatusDistributionChart data={charts.status_distribution} />
                        <ExecutionPercentChart data={charts.execution_by_percent} />
                    </div>
                    {status_stats && (
                        <Card>
                            <CardHeader>
                                <h3 className="font-semibold">Distribuição Detalhada</h3>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {status_stats.in_execution}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Em Execução</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-amber-600">
                                            {status_stats.ending_soon}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Finalizando</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {status_stats.rendering_accounts}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Prestar Contas</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-600">
                                            {status_stats.finished}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Finalizados</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-600">
                                            {status_stats.not_started}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">Não Iniciados</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                
                <TabsContent value="trends" className="space-y-4">
                    <BudgetTrendLineChart data={charts.trend} />
                    <ProjectsTimelineChart data={[]} />
                </TabsContent>
        </Tabs>
    );
}
