"use client"

import { useDashboardProjects, useDashboardStatusStats } from "@/hooks/use-dashboard-data";
import { ProjectsInExecutionCard } from "../projects-in-execution-card";
import { ProjectsEndingSoonCard } from "../projects-ending-soon-card";
import { useProjectsSidebar } from "@/hooks/use-projects-sidebar";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectsSectionProps {
    projectsLimit: number;
    enabled?: boolean;
}

/**
 * Seção de Projetos do Dashboard.
 * Focada em cards de projetos e estatísticas.
 */
export function ProjectsSection({ projectsLimit, enabled = true }: ProjectsSectionProps) {
    const { data: projectsData, isLoading: projectsLoading } = useDashboardProjects(projectsLimit, enabled);
    const { data: statusStats, isLoading: statsLoading } = useDashboardStatusStats(enabled);
    const sidebar = useProjectsSidebar();
    
    const limitedProjectsInExecution = useMemo(() => {
        if (!projectsData?.projects_in_execution) return [];
        return projectsLimit === -1 
            ? projectsData.projects_in_execution 
            : projectsData.projects_in_execution.slice(0, projectsLimit);
    }, [projectsData?.projects_in_execution, projectsLimit]);
    
    const limitedProjectsEndingSoon = useMemo(() => {
        if (!projectsData?.projects_ending_soon) return [];
        return projectsLimit === -1 
            ? projectsData.projects_ending_soon 
            : projectsData.projects_ending_soon.slice(0, projectsLimit);
    }, [projectsData?.projects_ending_soon, projectsLimit]);
    
    if (projectsLoading || statsLoading) {
        return (
            <div className="space-y-6">
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
    
    const inExecutionCount = statusStats?.in_execution || 0;
    const endingSoonCount = statusStats?.ending_soon || 0;
    
    return (
        <div className="space-y-6">
            {/* Cards de Projetos */}
            <div className="grid gap-4 md:grid-cols-2">
                <ProjectsInExecutionCard
                    count={inExecutionCount}
                    projects={limitedProjectsInExecution}
                    limit={projectsLimit}
                    onViewAll={() => sidebar.openSidebar('in_execution')}
                />
                <ProjectsEndingSoonCard
                    count={endingSoonCount}
                    projects={limitedProjectsEndingSoon}
                    limit={projectsLimit}
                    onViewAll={() => sidebar.openSidebar('ending_soon')}
                />
            </div>
            
            {/* Estatísticas Detalhadas */}
            {statusStats && (
                <Card>
                    <CardHeader>
                        <CardTitle>Distribuição Detalhada</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {statusStats.in_execution}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Em Execução</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-600">
                                    {statusStats.ending_soon}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Finalizando</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {statusStats.rendering_accounts}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Prestar Contas</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {statusStats.rendering_accounts_60days || 0}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Prazo de 60 Dias</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-600">
                                    {statusStats.not_started}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Não Iniciados</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

