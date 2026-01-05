"use client"

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertOctagon, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UrgencyLevel } from '@/types';
import { getUrgencyLabel, getUrgencyColor } from '@/lib/date-utils';

interface UrgencyBadgeProps {
    level: UrgencyLevel;
    showLabel?: boolean;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const urgencyConfigs = {
    4: {
        icon: AlertOctagon,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        label: 'Urgente',
        description: 'Requer ação imediata',
        pulse: true,
    },
    3: {
        icon: AlertOctagon,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-300',
        label: 'Crítico',
        description: 'Situação crítica',
        pulse: false,
    },
    2: {
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        label: 'Atenção',
        description: 'Requer atenção',
        pulse: false,
    },
    1: {
        icon: AlertCircle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        label: 'Alerta',
        description: 'Fique atento',
        pulse: false,
    },
    0: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        label: 'OK',
        description: 'Situação normal',
        pulse: false,
    },
};

const sizeClasses = {
    sm: 'h-5 px-1.5 text-[10px] gap-0.5',
    md: 'h-6 px-2 text-xs gap-1',
    lg: 'h-7 px-2.5 text-sm gap-1.5',
};

const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
};

export function UrgencyBadge({
    level,
    showLabel = true,
    showIcon = true,
    size = 'sm',
    className,
}: UrgencyBadgeProps) {
    const config = urgencyConfigs[level];
    const Icon = config.icon;

    // Don't show badge for level 0 unless explicitly needed
    if (level === 0 && !showLabel) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        variant="outline"
                        className={cn(
                            "font-medium border whitespace-nowrap",
                            config.bgColor,
                            config.borderColor,
                            config.color,
                            sizeClasses[size],
                            config.pulse && "animate-pulse",
                            className
                        )}
                    >
                        {showIcon && <Icon className={iconSizes[size]} />}
                        {showLabel && config.label}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">{config.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Versão compacta apenas com ícone
 */
export function UrgencyIcon({
    level,
    size = 'sm',
    className,
}: Omit<UrgencyBadgeProps, 'showLabel' | 'showIcon'>) {
    const config = urgencyConfigs[level];
    const Icon = config.icon;

    if (level === 0) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "inline-flex items-center justify-center",
                        config.pulse && "animate-pulse"
                    )}>
                        <Icon className={cn(iconSizes[size], config.color, className)} />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}







