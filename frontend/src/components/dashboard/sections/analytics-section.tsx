"use client"

import { useDashboardCharts } from "@/hooks/use-dashboard-data";
import { TopProjectsBarChart } from "../charts/top-projects-bar-chart";
import { StatusDistributionChart } from "../charts/status-distribution-chart";
import { ExecutionPercentChart } from "../charts/execution-percent-chart";
import { BudgetTrendLineChart } from "../charts/budget-trend-line-chart";
import { ProjectsTimelineChart } from "../charts/projects-timeline-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface AnalyticsSectionProps {
    enabled?: boolean;
}

/**
 * Seção de Análises do Dashboard.
 * Mostra todos os gráficos e análises detalhadas.
 */
export function AnalyticsSection({ enabled = true }: AnalyticsSectionProps) {
    const { data: chartsData, isLoading: chartsLoading } = useDashboardCharts(enabled);
    
    if (chartsLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <Card className="p-6">
                        <Skeleton className="h-[300px] w-full" />
                    </Card>
                    <Card className="p-6">
                        <Skeleton className="h-[300px] w-full" />
                    </Card>
                </div>
                <Card className="p-6">
                    <Skeleton className="h-[300px] w-full" />
                </Card>
            </div>
        );
    }
    
    if (!chartsData) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Gráficos Principais */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {chartsData.top_projects && (
                    <TopProjectsBarChart data={chartsData.top_projects} />
                )}
                {chartsData.status_distribution && (
                    <StatusDistributionChart data={chartsData.status_distribution} />
                )}
            </div>
            
            {/* Gráficos de Execução */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {chartsData.status_distribution && (
                    <StatusDistributionChart data={chartsData.status_distribution} />
                )}
                {chartsData.execution_by_percent && (
                    <ExecutionPercentChart data={chartsData.execution_by_percent} />
                )}
            </div>
            
            {/* Gráficos de Tendência */}
            {chartsData.trend && (
                <BudgetTrendLineChart data={chartsData.trend} />
            )}
            
            {/* Timeline de Projetos */}
            <ProjectsTimelineChart data={[]} />
        </div>
    );
}

