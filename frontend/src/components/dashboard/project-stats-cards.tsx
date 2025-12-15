"use client"

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectStats } from '@/types';
import { Briefcase, CheckCircle2, AlertTriangle, PlayCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
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
    const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());
    
    React.useEffect(() => {
        // Trigger animation after mount
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const toggleCard = (cardTitle: string) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardTitle)) {
                newSet.delete(cardTitle);
            } else {
                newSet.add(cardTitle);
            }
            return newSet;
        });
    };
    
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
            detailedInfo: `Total geral: ${stats.total} projetos\n\nInclui todos os projetos registrados no sistema, independente do status atual.`,
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
            detailedInfo: `Projetos ativos: ${stats.in_execution}\n\nProjetos que estão dentro do período de vigência (data de início ≤ hoje e data de fim ≥ hoje).`,
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
            description: "Todos os projetos encerrados que precisam prestar contas finais",
            detailedInfo: `Total: ${stats.rendering_accounts} projetos\nPrazo de 60 dias: ${stats.rendering_accounts_60days || 0} projetos\n\nTodos os projetos que já encerraram e precisam prestar contas finais. Os projetos com prazo de 60 dias são aqueles encerrados há menos de 60 dias.`,
            subtext: "Projetos encerrados"
        },
        {
            title: "Finalizados",
            value: stats.finalized || 0,
            icon: CheckCircle2,
            filterValue: 'finalized',
            color: "text-purple-600",
            bg: "bg-purple-50",
            border: "border-purple-200",
            hoverBorder: "hover:border-purple-300",
            description: "Projetos com status verificado como finalizado",
            detailedInfo: `Total: ${stats.finalized || 0} projetos\n\nProjetos que foram marcados como finalizados no sistema. Estes projetos já passaram por verificação e foram oficialmente finalizados.`,
            subtext: "Status verificado"
        }
    ];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch relative">
            {cards.map((card, index) => {
                const isActive = currentFilter === card.filterValue;
                const isExpanded = expandedCards.has(card.title);
                
                return (
                    <div
                        key={card.title}
                        className={cn(
                            "relative transition-all duration-300 ease-out flex flex-col",
                            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                            isExpanded && "z-[100]"
                        )}
                        style={{
                            transitionDelay: isLoaded ? `${index * 75}ms` : '0ms'
                        }}
                    >
                        <Card 
                            className={cn(
                                "border-2 group relative overflow-visible",
                                "transition-all duration-300 ease-out",
                                "hover:shadow-lg hover:-translate-y-0.5",
                                isActive ? card.border : "border-transparent",
                                isActive ? card.bg : "bg-card",
                                !isActive && card.hoverBorder,
                                "h-full flex flex-col min-h-[200px]"
                            )}
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
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "p-2 rounded-full transition-all duration-300",
                                        isActive ? card.bg : "bg-muted/50",
                                        "group-hover:scale-110"
                                    )}>
                                        <card.icon className={cn("h-4 w-4 transition-colors", card.color)} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <div className="flex-1">
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
                                </div>

                                {/* Indicador visual de mais informações */}
                                <div className="mt-auto pt-3 border-t">
                                    <button
                                        className={cn(
                                            "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md",
                                            "text-xs font-medium transition-all duration-200",
                                            "hover:bg-muted/50 active:scale-[0.98]",
                                            "border border-dashed",
                                            isExpanded 
                                                ? cn("bg-muted/30", card.border.replace('border-', 'border-')) 
                                                : "border-muted-foreground/20 hover:border-muted-foreground/40",
                                            card.color
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCard(card.title);
                                        }}
                                    >
                                        <Info className={cn(
                                            "h-3.5 w-3.5 transition-transform",
                                            isExpanded && "rotate-180"
                                        )} />
                                        <span className="font-semibold">
                                            {isExpanded ? 'Ocultar detalhes' : 'Ver mais informações'}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="h-3.5 w-3.5 transition-transform" />
                                        ) : (
                                            <ChevronDown className="h-3.5 w-3.5 transition-transform" />
                                        )}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Informações detalhadas sobrepostas ao card */}
                        {isExpanded && (
                            <Card 
                                className={cn(
                                    "absolute top-full left-0 right-0 mt-2 border-2",
                                    "transition-all duration-300 shadow-2xl",
                                    card.border,
                                    card.bg,
                                    "animate-in slide-in-from-top-2 fade-in-0"
                                )}
                                onClick={(e) => e.stopPropagation()}
                                style={{ zIndex: 9999 }}
                            >
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "p-2.5 rounded-lg",
                                            card.bg,
                                            "shrink-0 border-2",
                                            card.border
                                        )}>
                                            <Info className={cn("h-4 w-4", card.color)} />
                                        </div>
                                        <div className="flex-1 space-y-2.5 min-w-0">
                                            <p className="text-sm font-semibold text-foreground leading-relaxed">
                                                {card.description}
                                            </p>
                                            {card.detailedInfo && (
                                                <div className="text-xs text-muted-foreground space-y-2 leading-relaxed pt-1">
                                                    {card.detailedInfo.split('\n').map((line, idx) => {
                                                        if (!line.trim()) return <div key={idx} className="h-2" />;
                                                        return (
                                                            <p key={idx} className="flex items-start gap-2.5">
                                                                <span className={cn(
                                                                    "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                                                                    card.color.replace('text-', 'bg-')
                                                                )} />
                                                                <span className="flex-1">{line.trim()}</span>
                                                            </p>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
