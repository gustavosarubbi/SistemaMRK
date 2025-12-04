"use client"

import { Badge } from "@/components/ui/badge";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useDashboardAlerts } from "@/hooks/use-dashboard-alerts";
import { DashboardData } from "@/types";
import { cn } from "@/lib/utils";

interface AlertsBadgeProps {
    data: DashboardData | undefined;
}

export function AlertsBadge({ data }: AlertsBadgeProps) {
    const { alerts, totalAlerts, dismissAlert } = useDashboardAlerts(data);
    
    if (totalAlerts === 0) return null;
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                >
                    <Bell className="h-4 w-4" />
                    {totalAlerts > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {totalAlerts > 9 ? '9+' : totalAlerts}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Alertas</h4>
                        <span className="text-xs text-muted-foreground">
                            {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {alerts.map((alert, index) => {
                            const alertKey = `${alert.type}-${alert.count}`;
                            const isError = alert.type === 'multiple_critical';
                            
                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex items-start justify-between p-2 rounded-md border",
                                        isError
                                            ? "bg-red-50 border-red-200"
                                            : "bg-amber-50 border-amber-200"
                                    )}
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {alert.type === 'exceeded' && 'Execução Excedida'}
                                            {alert.type === 'multiple_critical' && 'Múltiplos Críticos'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {alert.message}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 ml-2"
                                        onClick={() => dismissAlert(alertKey)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

