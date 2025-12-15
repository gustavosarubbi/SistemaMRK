'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodFilterDropdownProps {
    months: { key: string; label: string; value: number }[];
    selectedMonths: Set<string>;
    onSelectionChange: (selected: Set<string>) => void;
}

export function PeriodFilterDropdown({
    months,
    selectedMonths,
    onSelectionChange,
}: PeriodFilterDropdownProps) {
    const [open, setOpen] = React.useState(false);

    // Group months by year
    const groupedByYear = useMemo(() => {
        const groups: Record<string, typeof months> = {};
        months.forEach((month) => {
            const year = month.key.split('-')[0];
            if (!groups[year]) {
                groups[year] = [];
            }
            groups[year].push(month);
        });
        return groups;
    }, [months]);

    const isAllSelected = selectedMonths.size === months.length && months.length > 0;
    const hasSelections = selectedMonths.size > 0;

    const selectAllMonths = () => {
        onSelectionChange(new Set(months.map((m) => m.key)));
    };

    const clearAllMonths = () => {
        onSelectionChange(new Set());
    };

    const toggleMonth = (monthKey: string) => {
        const newSet = new Set(selectedMonths);
        
        // Se todos estão selecionados e o usuário clica em um mês específico,
        // deseleciona todos e seleciona apenas aquele mês
        if (isAllSelected) {
            onSelectionChange(new Set([monthKey]));
        } else {
            // Comportamento normal: adiciona ou remove o mês
            if (newSet.has(monthKey)) {
                newSet.delete(monthKey);
            } else {
                newSet.add(monthKey);
            }
            onSelectionChange(newSet);
        }
    };

    const displayText =
        selectedMonths.size === months.length && months.length > 0
            ? 'Todos os períodos'
            : selectedMonths.size === 0
            ? 'Selecionar período'
            : `${selectedMonths.size} ${selectedMonths.size === 1 ? 'mês' : 'meses'} selecionados`;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-full sm:w-[280px] justify-between bg-white/5 border-white/10',
                        'hover:bg-white/10'
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="truncate">{displayText}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
                <div className="p-3 border-b">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Período de Análise</span>
                        <div className="flex gap-1">
                            <Button
                                variant={isAllSelected ? "ghost" : "default"}
                                size="sm"
                                onClick={selectAllMonths}
                                className={cn(
                                    "h-7 text-xs font-medium transition-all",
                                    isAllSelected 
                                        ? "opacity-50 cursor-not-allowed" 
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
                                )}
                                disabled={isAllSelected}
                            >
                                Todos
                            </Button>
                            {hasSelections && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearAllMonths}
                                    className="h-7 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                                >
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                    {Object.entries(groupedByYear)
                        .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                        .map(([year, yearMonths]) => (
                            <div key={year} className="mb-3 last:mb-0">
                                <div className="text-xs font-semibold text-muted-foreground px-2 mb-1">
                                    {year}
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {yearMonths.map((month) => {
                                        const isSelected = selectedMonths.has(month.key);
                                        return (
                                            <label
                                                key={month.key}
                                                className={cn(
                                                    'flex items-center gap-2 p-2 rounded-md cursor-pointer',
                                                    'hover:bg-muted/50 transition-colors',
                                                    isSelected && 'bg-blue-500/10'
                                                )}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleMonth(month.key)}
                                                />
                                                <span className="text-xs font-medium capitalize">
                                                    {month.label.split('/')[0]}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

