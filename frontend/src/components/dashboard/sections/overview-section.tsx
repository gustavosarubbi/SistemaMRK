import { PrimaryKPIs } from "../kpis/primary-kpis";
import { SecondaryKPIs } from "../kpis/secondary-kpis";
import { ProjectsInExecutionCard } from "../projects-in-execution-card";
import { ProjectsEndingSoonCard } from "../projects-ending-soon-card";
import { DashboardData } from "@/types";
import { useProjectsSidebar } from "@/hooks/use-projects-sidebar";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface OverviewSectionProps {
    projectsLimit: number;
    onProjectsLimitChange: (limit: number) => void;
    data: DashboardData | undefined;
    isLoading: boolean;
    projectsLoading?: boolean;
}

/**
 * Seção de Visão Geral do Dashboard.
 * Mostra KPIs principais (3-5) e cards de projetos.
 */
export function OverviewSection({
    projectsLimit,
    onProjectsLimitChange,
    data,
    isLoading,
    projectsLoading = false
}: OverviewSectionProps) {
    const kpisData = data?.kpis;
    const sidebar = useProjectsSidebar();



    const limitedProjectsInExecution = useMemo(() => {
        if (!data?.projects_in_execution) return [];
        return projectsLimit === -1
            ? data.projects_in_execution
            : data.projects_in_execution.slice(0, projectsLimit);
    }, [data?.projects_in_execution, projectsLimit]);

    const limitedProjectsEndingSoon = useMemo(() => {
        if (!data?.projects_ending_soon) return [];
        return projectsLimit === -1
            ? data.projects_ending_soon
            : data.projects_ending_soon.slice(0, projectsLimit);
    }, [data?.projects_ending_soon, projectsLimit]);

    if (isLoading && !data) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-4 w-24 mb-4" />
                            <Skeleton className="h-8 w-32" />
                        </Card>
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-6">
                        <Skeleton className="h-4 w-32 mb-4" />
                        <Skeleton className="h-8 w-16 mb-4" />
                        <Skeleton className="h-20 w-full" />
                    </Card>
                    <Card className="p-6">
                        <Skeleton className="h-4 w-32 mb-4" />
                        <Skeleton className="h-8 w-16 mb-4" />
                        <Skeleton className="h-20 w-full" />
                    </Card>
                </div>
            </div>
        );
    }

    if (!kpisData) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPIs Principais */}
            <PrimaryKPIs kpis={kpisData} />

            {/* KPIs Secundários (Expandível) */}
            <SecondaryKPIs kpis={kpisData} />

            {/* Cards de Projetos */}
            <div className="grid gap-4 md:grid-cols-2">
                <ProjectsInExecutionCard
                    count={kpisData?.in_execution || 0}
                    projects={limitedProjectsInExecution}
                    limit={projectsLimit}
                    onViewAll={() => sidebar.openSidebar('in_execution')}
                    isLoading={projectsLoading}
                />
                <ProjectsEndingSoonCard
                    count={kpisData?.ending_soon || 0}
                    projects={limitedProjectsEndingSoon}
                    limit={projectsLimit}
                    onViewAll={() => sidebar.openSidebar('ending_soon')}
                    isLoading={projectsLoading}
                />
            </div>
        </div>
    );
}
