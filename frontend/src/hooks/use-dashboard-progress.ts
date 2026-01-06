"use client"

import { useDashboardKPIs, useDashboardProjects, useDashboardCharts, useDashboardStatusStats } from './use-dashboard-data';
import { DashboardData } from '@/types';
import { useMemo, useState, useEffect } from 'react';

export function useDashboardProgress() {
    const [progress, setProgress] = useState(0);

    // Call all hooks in parallel
    const kpisQuery = useDashboardKPIs();
    const projectsQuery = useDashboardProjects(5); // Default limit for overview
    const chartsQuery = useDashboardCharts();
    const statusStatsQuery = useDashboardStatusStats();

    // Calculate progress
    useEffect(() => {
        let completed = 0;
        const total = 4;

        if (kpisQuery.isFetched) completed++;
        if (projectsQuery.isFetched) completed++;
        if (chartsQuery.isFetched) completed++;
        if (statusStatsQuery.isFetched) completed++;

        // Smooth progress animation
        const targetProgress = (completed / total) * 100;
        setProgress(prev => {
            if (targetProgress > prev) return targetProgress;
            return prev;
        });

    }, [kpisQuery.isFetched, projectsQuery.isFetched, chartsQuery.isFetched, statusStatsQuery.isFetched]);

    const isLoading =
        kpisQuery.isLoading ||
        projectsQuery.isLoading ||
        chartsQuery.isLoading ||
        statusStatsQuery.isLoading;

    // Aggregate data into a single object compatible with existing components
    const aggregatedData: DashboardData | undefined = useMemo(() => {
        // Only return data if KPIs are available (minimum requirement)
        if (!kpisQuery.data) return undefined;

        // Base Data with KPIs correctly nested
        const data: DashboardData = {
            kpis: kpisQuery.data,
            charts: {
                top_projects: [],
                trend: [],
                status_distribution: [],
                execution_by_percent: []
            },
            status_stats: {
                in_execution: 0,
                ending_soon: 0,
                rendering_accounts: 0,
                rendering_accounts_60days: 0,
                not_started: 0
            },
            projects_in_execution: [],
            projects_ending_soon: []
        };

        // Merge Status Stats
        if (statusStatsQuery.data) {
            data.status_stats = statusStatsQuery.data;
        }

        // Merge Projects
        if (projectsQuery.data) {
            data.projects_in_execution = projectsQuery.data.projects_in_execution;
            data.projects_ending_soon = projectsQuery.data.projects_ending_soon;
        }

        // Merge Charts
        if (chartsQuery.data) {
            data.charts = chartsQuery.data;
        }

        return data;
    }, [kpisQuery.data, projectsQuery.data, chartsQuery.data, statusStatsQuery.data]);

    return {
        data: aggregatedData,
        isLoading,
        projectsLoading: projectsQuery.isLoading,
        kpisLoading: kpisQuery.isLoading,
        chartsLoading: chartsQuery.isLoading,
        progress,
        refetch: () => {
            setProgress(0);
            kpisQuery.refetch();
            projectsQuery.refetch();
            chartsQuery.refetch();
            statusStatsQuery.refetch();
        }
    };
}
