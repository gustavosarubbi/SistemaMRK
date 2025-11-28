'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DashboardData } from '@/types';
import { format } from "date-fns";
import { KPICards } from '@/components/dashboard/kpi-cards';
import { TopProjectsBarChart } from '@/components/dashboard/charts/top-projects-bar-chart';
import { BudgetTrendLineChart } from '@/components/dashboard/charts/budget-trend-line-chart';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(2023, 0, 1));
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['dashboard-summary', startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
            if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
            const res = await api.get(`/dashboard/summary?${params.toString()}`);
            return res.data;
        },
        refetchInterval: 30000, // 30 seconds
        retry: 1, // Limita retries para evitar loops infinitos
        refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
    });

    const clearFilters = () => {
        setStartDate(undefined);
        setEndDate(undefined);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-md"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-32 bg-muted animate-pulse rounded mt-2"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="h-[300px] w-full bg-muted animate-pulse rounded-lg"></div>
            </div>
        );
    }

    if (error || !data) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center space-y-2">
                <div className="text-destructive font-medium">Erro ao carregar dados</div>
                <p className="text-muted-foreground text-sm">Verifique sua conexão e tente novamente.</p>
            </div>
        </div>
    );
    
    const { kpis, charts } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
                <PageHeader
                    title="Visão Geral"
                    description="Monitore o desempenho e atividade do sistema"
                    breadcrumbItems={[{ label: 'Visão Geral' }]}
                />
                
                <DashboardFilters 
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    clearFilters={clearFilters}
                />
            </div>

            <KPICards kpis={kpis} />
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                 <TopProjectsBarChart data={charts.top_projects} />
                 <BudgetTrendLineChart />
            </div>
        </div>
    );
}
