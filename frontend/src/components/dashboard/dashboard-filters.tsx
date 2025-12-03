"use client"

import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface DashboardFiltersProps {
    startDate: Date | undefined
    setStartDate: (date: Date | undefined) => void
    endDate: Date | undefined
    setEndDate: (date: Date | undefined) => void
    clearFilters: () => void
}

export function DashboardFilters({
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    clearFilters
}: DashboardFiltersProps) {
    const hasActiveFilters = startDate || endDate

    return (
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <DatePicker
                date={startDate}
                setDate={setStartDate}
                placeholder="Data inicial"
                className="w-full sm:w-[150px]"
            />
            <span className="text-muted-foreground hidden sm:inline">-</span>
            <DatePicker
                date={endDate}
                setDate={setEndDate}
                placeholder="Data final"
                className="w-full sm:w-[150px]"
            />
            
            {hasActiveFilters && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={clearFilters}
                    className="h-9 w-9"
                    title="Limpar filtros"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Limpar filtros</span>
                </Button>
            )}
        </div>
    )
}
