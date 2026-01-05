"use client"

import { useCallback } from 'react';
import { useDashboardContext } from '@/contexts/dashboard-context';
import { TimeRangePreset } from '@/types';
import { getDateRangeForPreset } from '@/lib/date-presets';

/**
 * Hook para gerenciar filtros do dashboard.
 * Fornece funções auxiliares para manipulação de filtros.
 */
export function useDashboardFilters() {
    const {
        startDate,
        endDate,
        timeRange,
        setStartDate,
        setEndDate,
        setTimeRange,
        clearFilters,
    } = useDashboardContext();
    
    const handleTimeRangeChange = useCallback((range: TimeRangePreset) => {
        setTimeRange(range);
        const { startDate: newStartDate, endDate: newEndDate } = getDateRangeForPreset(range);
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    }, [setTimeRange, setStartDate, setEndDate]);
    
    const hasActiveFilters = startDate !== undefined || endDate !== undefined;
    
    return {
        startDate,
        endDate,
        timeRange,
        setStartDate,
        setEndDate,
        setTimeRange,
        clearFilters,
        handleTimeRangeChange,
        hasActiveFilters,
    };
}


