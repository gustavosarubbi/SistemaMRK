import { Project } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Flame, Clock, AlertOctagon } from "lucide-react";

interface ProjectAlertsProps {
    project: Project;
}

export function ProjectAlerts({ project }: ProjectAlertsProps) {
    const alerts = [];
    
    // Parse dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let timePercent = 0;
    let daysSinceEnd = 0;
    
    if (project.CTT_DTINI && project.CTT_DTFIM && project.CTT_DTINI.length === 8 && project.CTT_DTFIM.length === 8) {
        const start = new Date(Number(project.CTT_DTINI.substring(0, 4)), Number(project.CTT_DTINI.substring(4, 6)) - 1, Number(project.CTT_DTINI.substring(6, 8)));
        const end = new Date(Number(project.CTT_DTFIM.substring(0, 4)), Number(project.CTT_DTFIM.substring(4, 6)) - 1, Number(project.CTT_DTFIM.substring(6, 8)));
        
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = today.getTime() - start.getTime();
        
        if (totalDuration > 0) {
            timePercent = (elapsed / totalDuration) * 100;
        }
        
        if (today > end) {
            daysSinceEnd = Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    const budgetUsage = project.usage_percent || 0;
    const hasBudget = (project.budget || 0) > 0;

    // Rule 1: Risk of Return (Time > 90% AND Budget Usage < 50%)
    if (hasBudget && timePercent > 90 && budgetUsage < 50 && timePercent <= 100) {
        alerts.push({
            id: 'return-risk',
            icon: AlertTriangle,
            color: 'text-amber-500',
            message: 'Risco de Devolução: Projeto acabando com muito saldo disponível.'
        });
    }

    // Rule 2: Accelerated Pace (Time < 20% AND Budget Usage > 40%)
    if (hasBudget && timePercent > 0 && timePercent < 20 && budgetUsage > 40) {
        alerts.push({
            id: 'accelerated',
            icon: Flame,
            color: 'text-orange-500',
            message: 'Ritmo Acelerado: Alto consumo de orçamento no início do projeto.'
        });
    }

    // Rule 3: Late Reporting (Rendering Accounts > 30 days)
    // "Rendering Accounts" means finished but < 60 days passed. 
    // If daysSinceEnd > 30, it's late in the reporting period.
    if (daysSinceEnd > 30 && daysSinceEnd <= 60) {
        alerts.push({
            id: 'late-reporting',
            icon: Clock,
            color: 'text-yellow-600',
            message: 'Prestação de Contas Crítica: Mais da metade do prazo de 60 dias já passou.'
        });
    }
    
    // Rule 4: Overbudget
    if (budgetUsage > 100) {
        alerts.push({
            id: 'overbudget',
            icon: AlertOctagon,
            color: 'text-destructive',
            message: 'Orçamento Excedido: O projeto gastou mais do que o planejado.'
        });
    }

    if (alerts.length === 0) return null;

    return (
        <div className="flex items-center gap-1">
            <TooltipProvider>
                {alerts.map((alert) => (
                    <Tooltip key={alert.id}>
                        <TooltipTrigger asChild>
                            <div className="cursor-help p-0.5 rounded-full hover:bg-muted/50">
                                <alert.icon className={`h-4 w-4 ${alert.color}`} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">{alert.message}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    );
}



