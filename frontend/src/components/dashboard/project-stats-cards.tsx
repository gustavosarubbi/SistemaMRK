"use client"

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectStats } from '@/types';
import { Briefcase, CheckCircle2, AlertTriangle, PlayCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectStatsCardsProps {
    stats?: ProjectStats;
    onFilterClick?: (status: string) => void;
    currentFilter?: string;
}

// Componente para animar números
function AnimatedNumber({ value, duration = 500 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = React.useState(0);
    
    React.useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeOutQuart * value));
            
            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };
        
        animationFrame = requestAnimationFrame(animate);
        
        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [value, duration]);
    
    return <span>{displayValue}</span>;
}

export function ProjectStatsCards({ stats, onFilterClick, currentFilter }: ProjectStatsCardsProps) {
    const [isLoaded, setIsLoaded] = React.useState(false);
    
    React.useEffect(() => {
        // Trigger animation after mount
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);
    
    if (!stats) {
        // Loading skeleton
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="border-2 border-transparent">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: "Total de Projetos",
            value: stats.total,
            icon: Briefcase,
            filterValue: 'all',
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-200",
            hoverBorder: "hover:border-blue-300",
            description: "Total de projetos cadastrados no período selecionado",
            subtext: "Projetos registrados"
        },
        {
            title: "Em Execução",
            value: stats.in_execution,
            icon: PlayCircle,
            filterValue: 'in_execution',
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-200",
            hoverBorder: "hover:border-green-300",
            description: "Projetos dentro do período de vigência",
            subtext: "Dentro da vigência"
        },
        {
            title: "Prestar Contas",
            value: stats.rendering_accounts,
            icon: AlertTriangle,
            filterValue: 'rendering_accounts',
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-200",
            hoverBorder: "hover:border-amber-300",
            description: "Projetos encerrados há menos de 60 dias que precisam prestar contas",
            subtext: "Prazo de 60 dias"
        },
        {
            title: "Finalizados",
            value: stats.finished,
            icon: CheckCircle2,
            filterValue: 'finished',
            color: "text-slate-600",
            bg: "bg-slate-50",
            border: "border-slate-200",
            hoverBorder: "hover:border-slate-300",
            description: "Projetos encerrados há mais de 60 dias",
            subtext: "Projetos encerrados"
        }
    ];

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, index) => {
                    const isActive = currentFilter === card.filterValue;
                    
                    return (
                        <Card 
                            key={card.title} 
                            className={cn(
                                "cursor-pointer border-2 group relative overflow-hidden",
                                "transition-all duration-300 ease-out",
                                "hover:shadow-lg hover:-translate-y-0.5",
                                isActive ? card.border : "border-transparent",
                                isActive ? card.bg : "bg-card",
                                !isActive && card.hoverBorder,
                                // Staggered animation on load
                                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                            )}
                            style={{
                                transitionDelay: isLoaded ? `${index * 75}ms` : '0ms'
                            }}
                            onClick={() => onFilterClick?.(card.filterValue)}
                        >
                            {/* Highlight indicator for active state */}
                            <div 
                                className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                                    isActive ? card.color.replace('text-', 'bg-') : "bg-transparent"
                                )}
                            />
                            
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                                    {card.title}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs max-w-[200px]">{card.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </CardTitle>
                                <div className={cn(
                                    "p-2 rounded-full transition-all duration-300",
                                    isActive ? card.bg : "bg-muted/50",
                                    "group-hover:scale-110"
                                )}>
                                    <card.icon className={cn("h-4 w-4 transition-colors", card.color)} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className={cn(
                                    "text-3xl font-bold tracking-tight transition-transform duration-300",
                                    "group-hover:scale-105 origin-left"
                                )}>
                                    <AnimatedNumber value={card.value} duration={800} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">
                                    {card.subtext}
                                </p>
                                
                                {/* Progress indicator showing percentage of total */}
                                {card.filterValue !== 'all' && stats.total > 0 && (
                                    <div className="mt-3 pt-2 border-t">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{((card.value / stats.total) * 100).toFixed(0)}% do total</span>
                                        </div>
                                        <div className="h-1 mt-1 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500 ease-out",
                                                    card.color.replace('text-', 'bg-')
                                                )}
                                                style={{ 
                                                    width: `${(card.value / stats.total) * 100}%`,
                                                    transitionDelay: `${index * 100 + 300}ms`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}
