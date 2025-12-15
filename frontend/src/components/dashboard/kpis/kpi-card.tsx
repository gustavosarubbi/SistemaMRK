"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    valueColor?: string;
    className?: string;
    subtitle?: string;
}

export function KPICard({
    title,
    value,
    description,
    icon: Icon,
    iconColor = "text-primary",
    iconBgColor = "bg-primary/10",
    valueColor,
    className,
    subtitle,
}: KPICardProps) {
    const displayValue = typeof value === 'number' 
        ? (title.toLowerCase().includes('projeto') ? value : formatCurrency(value))
        : value;
    
    return (
        <Card className={cn("hover:shadow-md transition-shadow", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn("p-1.5 rounded-full", iconBgColor)}>
                    <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                </div>
            </CardHeader>
            <CardContent>
                <div 
                    className={cn(
                        "text-xl font-bold truncate",
                        valueColor
                    )}
                    title={typeof value === 'number' && !title.toLowerCase().includes('projeto') 
                        ? formatCurrency(value) 
                        : String(value)}
                >
                    {displayValue}
                </div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {subtitle}
                    </p>
                )}
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

