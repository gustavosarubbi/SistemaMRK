import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectStats } from '@/types';
import { Briefcase, CheckCircle2, Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectStatsCardsProps {
    stats?: ProjectStats;
    onFilterClick?: (status: string) => void;
    currentFilter?: string;
}

export function ProjectStatsCards({ stats, onFilterClick, currentFilter }: ProjectStatsCardsProps) {
    if (!stats) return null;

    const cards = [
        {
            title: "Total de Projetos",
            value: stats.total,
            icon: Briefcase,
            filterValue: 'all',
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-200"
        },
        {
            title: "Em Execução",
            value: stats.in_execution,
            icon: PlayCircle,
            filterValue: 'in_execution',
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-200"
        },
        {
            title: "Prestar Contas",
            value: stats.rendering_accounts,
            icon: AlertTriangle,
            filterValue: 'rendering_accounts',
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-200"
        },
        {
            title: "Finalizados",
            value: stats.finished,
            icon: CheckCircle2,
            filterValue: 'finished',
            color: "text-slate-600",
            bg: "bg-slate-50",
            border: "border-slate-200"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
                const isActive = currentFilter === card.filterValue; // Only highlight specific matches
                
                return (
                    <Card 
                        key={card.title} 
                        className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                            isActive ? card.border : "border-transparent hover:border-border",
                            isActive ? card.bg : "bg-card"
                        )}
                        onClick={() => onFilterClick?.(card.filterValue)} // Pass the exact filter value
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <card.icon className={cn("h-4 w-4", card.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {card.filterValue === 'rendering_accounts' 
                                    ? "Prazo de 60 dias" 
                                    : card.filterValue === 'in_execution'
                                        ? "Dentro da vigência"
                                        : "Projetos registrados"}
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

