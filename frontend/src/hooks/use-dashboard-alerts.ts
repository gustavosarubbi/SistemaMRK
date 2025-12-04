"use client"

import { useEffect, useMemo } from "react";
import { DashboardData } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface AlertInfo {
    type: 'today' | 'exceeded' | 'multiple_critical';
    count: number;
    message: string;
}

export function useDashboardAlerts(data: DashboardData | undefined) {
    const [dismissedAlerts, setDismissedAlerts] = useLocalStorage<string[]>(
        'dashboard-dismissed-alerts',
        []
    );
    
    const alerts = useMemo(() => {
        if (!data) return [];
        
        const alertList: AlertInfo[] = [];
        
        // Check for projects ending today
        const todayCount = data.status_stats?.in_execution || 0;
        // We don't have exact "ending today" count, so we'll use a different approach
        // This would need to be calculated from projects_in_execution
        
        // Check for projects with execution > 100%
        const exceededProjects = data.projects_in_execution?.filter(
            p => p.usage_percent > 100
        ) || [];
        if (exceededProjects.length > 0) {
            alertList.push({
                type: 'exceeded',
                count: exceededProjects.length,
                message: `${exceededProjects.length} projeto${exceededProjects.length !== 1 ? 's' : ''} com execução acima de 100%`
            });
        }
        
        // Check for multiple critical projects
        const criticalCount = exceededProjects.length;
        if (criticalCount >= 3) {
            alertList.push({
                type: 'multiple_critical',
                count: criticalCount,
                message: `${criticalCount} projeto${criticalCount !== 1 ? 's' : ''} com execução acima de 100% precisando de atenção urgente`
            });
        }
        
        return alertList;
    }, [data]);
    
    // Show toast alerts
    useEffect(() => {
        if (!data || alerts.length === 0) return;
        
        alerts.forEach((alert) => {
            const alertKey = `${alert.type}-${alert.count}`;
            
            // Check if alert was dismissed
            if (dismissedAlerts.includes(alertKey)) {
                return;
            }
            
            // Show toast based on alert type
            let toastType: 'error' | 'warning' = 'warning';
            if (alert.type === 'multiple_critical') {
                toastType = 'error';
            }
            
            toast({
                type: toastType,
                title: 'Atenção Necessária',
                description: alert.message,
                duration: 5000,
            });
        });
    }, [alerts, dismissedAlerts, data]);
    
    const dismissAlert = (alertKey: string) => {
        setDismissedAlerts([...dismissedAlerts, alertKey]);
    };
    
    const clearDismissedAlerts = () => {
        setDismissedAlerts([]);
    };
    
    return {
        alerts,
        totalAlerts: alerts.length,
        dismissedAlerts,
        dismissAlert,
        clearDismissedAlerts,
    };
}

