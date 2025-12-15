"use client"

import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { X, Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimeRangePreset } from "@/types"
import { getDateRangeForPreset, detectPresetFromDates, getPresetLabel } from "@/lib/date-presets"
import { useEffect } from "react"

interface DashboardFiltersProps {
    startDate: Date | undefined
    setStartDate: (date: Date | undefined) => void
    endDate: Date | undefined
    setEndDate: (date: Date | undefined) => void
    clearFilters: () => void
    timeRange?: TimeRangePreset
    onTimeRangeChange?: (range: TimeRangePreset) => void
}

export function DashboardFilters({
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    clearFilters,
    timeRange,
    onTimeRangeChange
}: DashboardFiltersProps) {
    const hasActiveFilters = startDate || endDate
    
    // Detect preset from current dates
    const currentPreset = timeRange || detectPresetFromDates(startDate, endDate)
    
    const handlePresetChange = (preset: string) => {
        const selectedPreset = preset as TimeRangePreset
        if (onTimeRangeChange) {
            onTimeRangeChange(selectedPreset)
        }
        
        if (selectedPreset === 'custom') {
            // Don't change dates, let user pick manually
            return
        }
        
        const { startDate: newStartDate, endDate: newEndDate } = getDateRangeForPreset(selectedPreset)
        setStartDate(newStartDate)
        setEndDate(newEndDate)
    }
    
    // Update preset when dates change manually
    useEffect(() => {
        if (!timeRange && startDate && endDate) {
            const detected = detectPresetFromDates(startDate, endDate)
            // Only update if it's not custom (to avoid infinite loop)
            if (detected !== 'custom' && onTimeRangeChange) {
                onTimeRangeChange(detected)
            }
        }
    }, [startDate, endDate, timeRange, onTimeRangeChange])

    return (
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Select value={currentPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="last30">{getPresetLabel('last30')}</SelectItem>
                    <SelectItem value="last90">{getPresetLabel('last90')}</SelectItem>
                    <SelectItem value="last180">{getPresetLabel('last180')}</SelectItem>
                    <SelectItem value="last365">{getPresetLabel('last365')}</SelectItem>
                    <SelectItem value="this_month">{getPresetLabel('this_month')}</SelectItem>
                    <SelectItem value="last_month">{getPresetLabel('last_month')}</SelectItem>
                    <SelectItem value="this_quarter">{getPresetLabel('this_quarter')}</SelectItem>
                    <SelectItem value="last_quarter">{getPresetLabel('last_quarter')}</SelectItem>
                    <SelectItem value="this_year">{getPresetLabel('this_year')}</SelectItem>
                    <SelectItem value="last_year">{getPresetLabel('last_year')}</SelectItem>
                    <SelectItem value="custom">{getPresetLabel('custom')}</SelectItem>
                </SelectContent>
            </Select>
            
            {currentPreset === 'custom' && (
                <>
                    <DatePicker
                        date={startDate}
                        setDate={setStartDate}
                        placeholder="Data inicial"
                        className="w-full sm:w-[180px]"
                        showClearButton={true}
                    />
                    <DatePicker
                        date={endDate}
                        setDate={setEndDate}
                        placeholder="Data final"
                        className="w-full sm:w-[180px]"
                        showClearButton={true}
                    />
                </>
            )}
            
            {hasActiveFilters && currentPreset !== 'custom' && (
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
