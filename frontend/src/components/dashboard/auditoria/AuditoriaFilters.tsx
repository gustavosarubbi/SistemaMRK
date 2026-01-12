"use client";

import React from 'react';
import { Search, Calendar, DollarSign, Filter, CreditCard, CheckCircle2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditoriaFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;

    // Split Date Inputs
    dateStart: Date | undefined;
    onDateStartChange: (date: Date | undefined) => void;
    dateEnd: Date | undefined;
    onDateEndChange: (date: Date | undefined) => void;

    minAmount: string;
    onMinAmountChange: (value: string) => void;
    maxAmount: string;
    onMaxAmountChange: (value: string) => void;

    // New Filters
    trnType: string;
    onTrnTypeChange: (value: string) => void;
    validationStatus: string;
    onValidationStatusChange: (value: string) => void;

    onProjectIdChange: (value: string) => void;
}

export const AuditoriaFilters: React.FC<AuditoriaFiltersProps> = ({
    searchTerm,
    onSearchChange,
    dateStart,
    onDateStartChange,
    dateEnd,
    onDateEndChange,
    minAmount,
    onMinAmountChange,
    maxAmount,
    onMaxAmountChange,
    trnType,
    onTrnTypeChange,
    validationStatus,
    onValidationStatusChange,
    onProjectIdChange,
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-4 flex flex-wrap items-center gap-3 transition-all">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <Input
                    placeholder="Filtrar por Histórico..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-9 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-300 font-medium text-sm transition-all"
                />
            </div>

            <div className="h-6 w-px bg-slate-200 hidden lg:block"></div>

            {/* Date Start */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={`h-9 gap-2 border-slate-200 ${dateStart ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-600 bg-slate-50'}`}>
                        <Calendar className="h-4 w-4" />
                        {dateStart ? format(dateStart, "dd/MM/yyyy") : "Data Inicial"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                        mode="single"
                        selected={dateStart}
                        onSelect={onDateStartChange}
                        initialFocus
                        locale={ptBR}
                    />
                </PopoverContent>
            </Popover>

            {/* Date End */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={`h-9 gap-2 border-slate-200 ${dateEnd ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-600 bg-slate-50'}`}>
                        <Calendar className="h-4 w-4" />
                        {dateEnd ? format(dateEnd, "dd/MM/yyyy") : "Data Final"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                        mode="single"
                        selected={dateEnd}
                        onSelect={onDateEndChange}
                        initialFocus
                        locale={ptBR}
                    />
                </PopoverContent>
            </Popover>

            <div className="h-6 w-px bg-slate-200 hidden lg:block"></div>

            {/* Transaction Type Filter */}
            <Select value={trnType} onValueChange={onTrnTypeChange}>
                <SelectTrigger className={`h-9 w-[130px] border-slate-200 ${trnType ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-600'}`}>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span className="truncate">{!trnType ? 'Tipo' : trnType === 'CREDIT' ? 'Créditos' : 'Débitos'}</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos os Tipos</SelectItem>
                    <SelectItem value="CREDIT">Créditos (Entradas)</SelectItem>
                    <SelectItem value="DEBIT">Débitos (Saídas)</SelectItem>
                </SelectContent>
            </Select>

            {/* Validation Status Filter */}
            <Select value={validationStatus} onValueChange={onValidationStatusChange}>
                <SelectTrigger className={`h-9 w-[130px] border-slate-200 ${validationStatus ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-600'}`}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="truncate">
                            {!validationStatus ? 'Status' :
                                validationStatus === 'VALIDATED' ? 'Validado' :
                                    validationStatus === 'DISCREPANCY' ? 'Divergente' : 'Pendente'}
                        </span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="VALIDATED">Validado</SelectItem>
                    <SelectItem value="DISCREPANCY">Divergente</SelectItem>
                </SelectContent>
            </Select>

            {/* Value Range */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={`h-9 gap-2 border-slate-200 ${(minAmount || maxAmount) ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-600 bg-slate-50'}`}>
                        <DollarSign className="h-4 w-4" />
                        Valor
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none text-slate-900">Faixa de Valor</h4>
                            <p className="text-sm text-slate-500">Filtre por valores mínimos e máximos.</p>
                        </div>
                        <div className="grid gap-2">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="text-sm text-slate-600">Mínimo</span>
                                <Input
                                    type="number"
                                    value={minAmount}
                                    onChange={(e) => onMinAmountChange(e.target.value)}
                                    className="col-span-2 h-8"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="text-sm text-slate-600">Máximo</span>
                                <Input
                                    type="number"
                                    value={maxAmount}
                                    onChange={(e) => onMaxAmountChange(e.target.value)}
                                    className="col-span-2 h-8"
                                    placeholder="Max"
                                />
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 ml-auto"
                onClick={() => {
                    onSearchChange('');
                    onDateStartChange(undefined);
                    onDateEndChange(undefined);
                    onMinAmountChange('');
                    onMaxAmountChange('');
                    onTrnTypeChange('');
                    onValidationStatusChange('');
                    onProjectIdChange('all');
                }}
            >
                Limpar
            </Button>
        </div>
    );
};
