"use client"

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/lib/api';
import { DashboardData, KPI } from '@/types';
import { useDashboardContext } from '@/contexts/dashboard-context';

/**
 * Hook para buscar dados completos do dashboard.
 * Usa o endpoint /summary para compatibilidade.
 */
export function useDashboardSummary() {
    const { startDate, endDate } = useDashboardContext();
    
    return useQuery<DashboardData>({
        queryKey: ['dashboard-summary', startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
            if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
            const res = await api.get(`/dashboard/summary?${params.toString()}`);
            return res.data;
        },
        staleTime: 120000, // 2 minutos
        gcTime: 300000, // 5 minutos
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });
}

/**
 * Hook para buscar apenas KPIs.
 * Otimizado para carregamento rápido da aba principal.
 */
export function useDashboardKPIs(enabled: boolean = true) {
    const { startDate, endDate } = useDashboardContext();
    
    return useQuery<KPI>({
        queryKey: ['dashboard-kpis', startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
            if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
            const res = await api.get(`/dashboard/kpis?${params.toString()}`);
            return res.data;
        },
        staleTime: 120000,
        gcTime: 300000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        enabled, // Controlado externamente para lazy loading
    });
}

/**
 * Hook para buscar apenas projetos.
 * Otimizado para carregamento da seção de projetos.
 */
export function useDashboardProjects(limit: number = 10, enabled: boolean = true) {
    const { startDate, endDate } = useDashboardContext();
    
    return useQuery<{
        projects_in_execution: DashboardData['projects_in_execution'];
        projects_ending_soon: DashboardData['projects_ending_soon'];
    }>({
        queryKey: ['dashboard-projects', startDate, endDate, limit],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
            if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
            params.append('limit', limit.toString());
            const res = await api.get(`/dashboard/projects?${params.toString()}`);
            return res.data;
        },
        staleTime: 120000,
        gcTime: 300000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        enabled, // Controlado externamente para lazy loading
    });
}

/**
 * Hook para buscar apenas dados de gráficos.
 * Otimizado para carregamento da seção de análises.
 */
export function useDashboardCharts(enabled: boolean = true) {
    const { startDate, endDate } = useDashboardContext();
    
    return useQuery<DashboardData['charts']>({
        queryKey: ['dashboard-charts', startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
            if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
            const res = await api.get(`/dashboard/charts?${params.toString()}`);
            return res.data;
        },
        staleTime: 120000,
        gcTime: 300000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        enabled, // Controlado externamente para lazy loading
    });
}

/**
 * Hook para buscar apenas estatísticas de status.
 * Otimizado para carregamento rápido.
 */
export function useDashboardStatusStats(enabled: boolean = true) {
    const { startDate, endDate } = useDashboardContext();
    
    return useQuery<DashboardData['status_stats']>({
        queryKey: ['dashboard-status-stats', startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
            if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
            const res = await api.get(`/dashboard/status-stats?${params.toString()}`);
            return res.data;
        },
        staleTime: 120000,
        gcTime: 300000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        enabled,
    });
}

