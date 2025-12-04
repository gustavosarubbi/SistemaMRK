"use client"

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    AlertOctagon, 
    Clock, 
    AlertTriangle, 
    CalendarX, 
    TrendingUp,
    X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterPreset } from '@/types';
import { getDisplayPresets } from '@/lib/filter-presets';

interface QuickFilterChipsProps {
    activePreset?: FilterPreset;
    onPresetChange: (preset: FilterPreset | undefined) => void;
    counts?: {
        critical?: number;
        urgentWeek?: number;
        renderingAccounts?: number;
        renderingUrgent?: number;
        highExecution?: number;
    };
}

const chipConfigs = [
    {
        id: 'critical' as FilterPreset,
        label: 'Críticos',
        icon: AlertOctagon,
        color: 'text-red-700',
        bgColor: 'bg-red-100 hover:bg-red-200',
        activeBg: 'bg-red-600 text-white hover:bg-red-700',
        countKey: 'critical',
    },
    {
        id: 'urgent_attention' as FilterPreset,
        label: 'Vence em 7 dias',
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 hover:bg-orange-200',
        activeBg: 'bg-orange-600 text-white hover:bg-orange-700',
        countKey: 'urgentWeek',
    },
    {
        id: 'render_accounts' as FilterPreset,
        label: 'Prestar Contas',
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100 hover:bg-amber-200',
        activeBg: 'bg-amber-600 text-white hover:bg-amber-700',
        countKey: 'renderingAccounts',
    },
    {
        id: 'rendering_urgent' as FilterPreset,
        label: 'PC Urgente',
        icon: CalendarX,
        color: 'text-rose-700',
        bgColor: 'bg-rose-100 hover:bg-rose-200',
        activeBg: 'bg-rose-600 text-white hover:bg-rose-700',
        countKey: 'renderingUrgent',
    },
    {
        id: 'ending_soon' as FilterPreset,
        label: 'Atenção Financeira',
        icon: TrendingUp,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 hover:bg-purple-200',
        activeBg: 'bg-purple-600 text-white hover:bg-purple-700',
        countKey: 'highExecution',
    },
];

export function QuickFilterChips({ 
    activePreset, 
    onPresetChange,
    counts = {}
}: QuickFilterChipsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">
                Filtros rápidos:
            </span>
            
            {chipConfigs.map((chip) => {
                const isActive = activePreset === chip.id;
                const Icon = chip.icon;
                const count = counts[chip.countKey as keyof typeof counts];
                
                return (
                    <Button
                        key={chip.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-7 px-2.5 text-xs font-medium gap-1.5 rounded-full transition-all",
                            isActive ? chip.activeBg : chip.bgColor,
                            !isActive && chip.color
                        )}
                        onClick={() => onPresetChange(isActive ? undefined : chip.id)}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {chip.label}
                        {count !== undefined && count > 0 && (
                            <Badge 
                                variant={isActive ? "secondary" : "outline"}
                                className={cn(
                                    "h-4 px-1 text-[10px] ml-0.5",
                                    isActive && "bg-white/20 text-white border-transparent"
                                )}
                            >
                                {count}
                            </Badge>
                        )}
                    </Button>
                );
            })}
            
            {activePreset && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => onPresetChange(undefined)}
                    title="Limpar filtro"
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
}

