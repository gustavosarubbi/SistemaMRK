"use client"

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertOctagon, AlertTriangle, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UrgencyCardsProps {
    counts: {
        vencendoHoje: number;
        urgentWeek: number;
        critical: number;
        renderingUrgent: number;
        renderingAccounts: number;
    };
    renderingAccounts60Days?: number; // Projetos com prazo de 60 dias
    onCardClick: (filter: string) => void;
    activeFilter?: string;
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

export function UrgencyCards({ counts, renderingAccounts60Days = 0, onCardClick, activeFilter }: UrgencyCardsProps) {
    const cards = [
        {
            id: 'critical',
            title: 'Críticos',
            value: counts.critical,
            icon: AlertOctagon,
            color: 'text-red-700',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-300',
            hoverBorder: 'hover:border-red-400',
            description: 'Vigência vence em ≤7 dias, PC urgente ou execução >100%',
            detailedInfo: `Total de projetos críticos que exigem atenção imediata`,
            pulse: counts.critical > 0,
        },
        {
            id: 'rendering_urgent',
            title: 'PC Urgente',
            value: counts.renderingUrgent,
            icon: CalendarX,
            color: 'text-rose-700',
            bgColor: 'bg-rose-100',
            borderColor: 'border-rose-300',
            hoverBorder: 'hover:border-rose-400',
            description: 'Prestação de contas com ≤15 dias restantes',
            detailedInfo: `Projetos com prestação de contas urgente (≤15 dias restantes)`,
            pulse: counts.renderingUrgent > 0,
        },
        {
            id: 'rendering',
            title: 'Prestar Contas',
            value: counts.renderingAccounts,
            icon: AlertTriangle,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            hoverBorder: 'hover:border-amber-300',
            description: 'Em período de prestação de contas',
            detailedInfo: `Total: ${counts.renderingAccounts} projetos\nPrazo de 60 dias: ${renderingAccounts60Days} projetos`,
            pulse: false,
        },
    ];

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {cards.map((card) => {
                    const isActive = activeFilter === card.id;
                    const Icon = card.icon;
                    
                    return (
                        <Tooltip key={card.id}>
                            <TooltipTrigger asChild>
                                <Card
                                    className={cn(
                                        "cursor-pointer border-2 transition-all duration-200",
                                        "hover:shadow-md hover:-translate-y-0.5",
                                        isActive ? card.borderColor : "border-transparent",
                                        isActive ? card.bgColor : "bg-card",
                                        !isActive && card.hoverBorder,
                                        card.pulse && card.value > 0 && "animate-pulse-subtle"
                                    )}
                                    onClick={() => onCardClick(card.id)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                                    {card.title}
                                                </p>
                                                <p className={cn("text-2xl font-bold", card.color)}>
                                                    <AnimatedNumber value={card.value} />
                                                </p>
                                            </div>
                                            <div className={cn(
                                                "p-2 rounded-full",
                                                isActive ? card.bgColor : "bg-muted/50"
                                            )}>
                                                <Icon className={cn("h-5 w-5", card.color)} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold">{card.description}</p>
                                    {card.detailedInfo && (
                                        <p className="text-xs text-muted-foreground whitespace-pre-line">
                                            {card.detailedInfo}
                                        </p>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}

