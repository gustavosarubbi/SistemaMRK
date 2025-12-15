'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
    dateFrom?: Date;
    dateTo?: Date;
    onDateFromChange: (date: Date | undefined) => void;
    onDateToChange: (date: Date | undefined) => void;
    onClear: () => void;
    className?: string;
}

const PRESETS = [
    { label: 'Últimos 7 dias', days: 7 },
    { label: 'Últimos 30 dias', days: 30 },
    { label: 'Este mês', getDates: () => {
        const now = new Date();
        return {
            from: new Date(now.getFullYear(), now.getMonth(), 1),
            to: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
    }},
    { label: 'Mês passado', getDates: () => {
        const now = new Date();
        return {
            from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            to: new Date(now.getFullYear(), now.getMonth(), 0)
        };
    }},
    { label: 'Este trimestre', getDates: () => {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        return {
            from: new Date(now.getFullYear(), quarter * 3, 1),
            to: new Date(now.getFullYear(), (quarter + 1) * 3, 0)
        };
    }},
    { label: 'Este ano', getDates: () => {
        const now = new Date();
        return {
            from: new Date(now.getFullYear(), 0, 1),
            to: new Date(now.getFullYear(), 11, 31)
        };
    }},
] as const;

export function DateRangeFilter({
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    onClear,
    className,
}: DateRangeFilterProps) {
    const [fromOpen, setFromOpen] = useState(false);
    const [toOpen, setToOpen] = useState(false);

    const handlePreset = (preset: typeof PRESETS[number]) => {
        if ('days' in preset && preset.days) {
            const to = new Date();
            const from = new Date();
            from.setDate(from.getDate() - preset.days);
            onDateFromChange(from);
            onDateToChange(to);
        } else if (preset.getDates) {
            const { from, to } = preset.getDates();
            onDateFromChange(from);
            onDateToChange(to);
        }
        setFromOpen(false);
        setToOpen(false);
    };

    const hasFilter = dateFrom || dateTo;

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {/* Presets */}
            <div className="flex flex-wrap gap-1 overflow-x-auto pb-2">
                {PRESETS.map((preset) => (
                    <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handlePreset(preset)}
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>

            {/* Date Pickers */}
            <div className="flex gap-2">
                <Popover open={fromOpen} onOpenChange={setFromOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-8 w-[140px] justify-start text-left font-normal",
                                !dateFrom && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={(date) => {
                                onDateFromChange(date);
                                setFromOpen(false); // Fecha imediatamente após seleção
                            }}
                            initialFocus
                            locale={ptBR}
                        />
                    </PopoverContent>
                </Popover>

                <Popover open={toOpen} onOpenChange={setToOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-8 w-[140px] justify-start text-left font-normal",
                                !dateTo && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={(date) => {
                                onDateToChange(date);
                                setToOpen(false); // Fecha imediatamente após seleção
                            }}
                            initialFocus
                            locale={ptBR}
                            disabled={(date) => dateFrom ? date < dateFrom : false}
                        />
                    </PopoverContent>
                </Popover>

                {hasFilter && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={onClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

