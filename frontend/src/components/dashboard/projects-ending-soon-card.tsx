"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ProjectListItem } from "@/types";
import { formatDaysRemaining } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface ProjectsEndingSoonCardProps {
    count: number;
    projects?: ProjectListItem[];
    limit?: number;
    onViewAll?: () => void;
}

export function ProjectsEndingSoonCard({ 
    count, 
    projects = [], 
    limit = 5,
    onViewAll 
}: ProjectsEndingSoonCardProps) {
    const router = useRouter();
    
    const displayedProjects = projects.slice(0, limit);
    const hasMore = projects.length > limit;
    
    const handleViewAll = () => {
        if (onViewAll) {
            onViewAll();
        } else {
            router.push('/dashboard/projects?status=in_execution&sort=days_remaining&filter=ending_soon');
        }
    };
    
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Finalizando em Breve
                </CardTitle>
                <div className="p-1.5 bg-amber-500/10 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-amber-600 mb-2">{count}</div>
                <p className="text-xs text-muted-foreground mb-4">
                    Projetos finalizando nos próximos 30 dias
                </p>
                
                {displayedProjects.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {displayedProjects.map((project) => {
                            const isUrgent = project.daysRemaining !== null && project.daysRemaining <= 7;
                            const isCritical = project.daysRemaining !== null && project.daysRemaining <= 0;
                            
                            return (
                                <div 
                                    key={project.id} 
                                    className={cn(
                                        "flex items-center justify-between text-sm p-2 rounded-md border",
                                        isCritical && "bg-red-50 border-red-200",
                                        isUrgent && !isCritical && "bg-orange-50 border-orange-200",
                                        !isUrgent && "bg-amber-50/50 border-amber-200"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{project.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                {project.daysRemaining !== null 
                                                    ? formatDaysRemaining(project.daysRemaining)
                                                    : 'Data não definida'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right ml-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {project.usage_percent.toFixed(0)}%
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {(hasMore || displayedProjects.length === 0) && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={handleViewAll}
                    >
                        {displayedProjects.length === 0 
                            ? 'Ver projetos' 
                            : `Ver todos (${count})`}
                        <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}







