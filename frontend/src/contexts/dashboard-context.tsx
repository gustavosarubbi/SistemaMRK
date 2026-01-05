"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Date as DateType } from '@/types';
import { TimeRangePreset } from '@/types';

interface DashboardContextType {
    // Filtros
    startDate: Date | undefined;
    endDate: Date | undefined;
    timeRange: TimeRangePreset;
    
    // Setters
    setStartDate: (date: Date | undefined) => void;
    setEndDate: (date: Date | undefined) => void;
    setTimeRange: (range: TimeRangePreset) => void;
    clearFilters: () => void;
    
    // Estado de loading
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    
    // Erro
    error: Error | null;
    setError: (error: Error | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(2023, 0, 1));
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [timeRange, setTimeRange] = useState<TimeRangePreset>('custom');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const clearFilters = useCallback(() => {
        setStartDate(undefined);
        setEndDate(undefined);
        setTimeRange('custom');
    }, []);
    
    return (
        <DashboardContext.Provider
            value={{
                startDate,
                endDate,
                timeRange,
                setStartDate,
                setEndDate,
                setTimeRange,
                clearFilters,
                isLoading,
                setIsLoading,
                error,
                setError,
            }}
        >
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboardContext() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboardContext must be used within a DashboardProvider');
    }
    return context;
}


