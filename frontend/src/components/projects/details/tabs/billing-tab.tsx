'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X, FileText, DollarSign, Calendar, ChevronDown, Download, FileSpreadsheet, File, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportBilling, exportBillingToCSV, exportBillingToExcel, exportBillingToPDF } from '@/lib/export-utils';

interface BillingTabProps {
    projectCode: string;
    projectName: string;
}

interface BillingRecord {
    R_E_C_N_O_?: number;
    C6_CUSTO?: string;
    C6_PRCVEN?: number;
    C6_ITEM?: string;
    C6_SERIE?: string;
    C6_NOTA?: string;
    C6_FILIAL?: string;
    C6_DATFAT?: string;
    C6_DESCRI?: string;
}

interface BillingResponse {
    project_code: string;
    project_name: string;
    billing_records: BillingRecord[];
    total_billing: number;
    count: number;
    total_provisions?: number;
    billed?: number;
    pending?: number;
}

// Formatar data de YYYYMMDD para DD/MM/YYYY
const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr.length !== 8) return '-';
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
};

export function BillingTab({ projectCode, projectName }: BillingTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [sortField, setSortField] = useState<'item' | 'value' | 'serie' | 'nota' | 'date'>('item');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isExporting, setIsExporting] = useState(false);

    // Fetch billing data
    const { data: billingData, isLoading, error } = useQuery<BillingResponse>({
        queryKey: ['project_billing', projectCode],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectCode}/billing`);
            return res.data;
        },
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const billingRecords = billingData?.billing_records || [];
    const totalBilling = billingData?.total_billing || 0;

    // Extrair períodos disponíveis baseados nas datas existentes
    const availablePeriods = useMemo(() => {
        const periods = new Map<string, { year: number; month: number; label: string }>();
        const years = new Set<number>();
        
        billingRecords.forEach((record: BillingRecord) => {
            if (record.C6_DATFAT && record.C6_DATFAT.length === 8) {
                const year = parseInt(record.C6_DATFAT.substring(0, 4));
                const month = parseInt(record.C6_DATFAT.substring(4, 6));
                const key = `${year}-${month}`;
                
                if (!periods.has(key)) {
                    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    
                    periods.set(key, {
                        year,
                        month,
                        label: `${monthNames[month - 1]} ${year}`,
                    });
                    years.add(year);
                }
            }
        });
        
        // Ordenar por data (mais recente primeiro)
        const sortedPeriods = Array.from(periods.values()).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
        
        return { periods: sortedPeriods, years: Array.from(years).sort((a, b) => b - a) };
    }, [billingRecords]);

    // Funções auxiliares para o filtro de períodos
    const togglePeriod = (periodKey: string) => {
        setSelectedPeriods(prev => {
            const newSet = new Set(prev);
            if (newSet.has(periodKey)) {
                newSet.delete(periodKey);
            } else {
                newSet.add(periodKey);
            }
            return newSet;
        });
        setCurrentPage(1);
    };

    const clearAllPeriods = () => {
        setSelectedPeriods(new Set());
        setCurrentPage(1);
    };

    const isAllSelected = selectedPeriods.size === 0 || 
        selectedPeriods.size === availablePeriods.periods.length;

    const hasActiveFilters = searchTerm || (selectedPeriods.size > 0 && selectedPeriods.size < availablePeriods.periods.length);

    // Filtered and sorted billing records
    const filteredRecords = useMemo(() => {
        let filtered = billingRecords.filter((record: BillingRecord) => {
            // Search filter
            const matchesSearch = !searchTerm || 
                (record.C6_ITEM && record.C6_ITEM.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (record.C6_SERIE && record.C6_SERIE.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (record.C6_NOTA && record.C6_NOTA.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (record.C6_DESCRI && record.C6_DESCRI.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // Period filter
            let matchesPeriod = true;
            if (selectedPeriods.size > 0 && selectedPeriods.size < availablePeriods.periods.length) {
                if (record.C6_DATFAT && record.C6_DATFAT.length === 8) {
                    const year = record.C6_DATFAT.substring(0, 4);
                    const month = record.C6_DATFAT.substring(4, 6);
                    const periodKey = `${year}-${parseInt(month)}`;
                    matchesPeriod = selectedPeriods.has(periodKey);
                } else {
                    matchesPeriod = false;
                }
            }
            
            return matchesSearch && matchesPeriod;
        });

        // Sorting
        filtered.sort((a: BillingRecord, b: BillingRecord) => {
            let aVal: string | number, bVal: string | number;
            
            switch (sortField) {
                case 'item':
                    aVal = a.C6_ITEM || '';
                    bVal = b.C6_ITEM || '';
                    break;
                case 'value':
                    aVal = a.C6_PRCVEN || 0;
                    bVal = b.C6_PRCVEN || 0;
                    break;
                case 'serie':
                    aVal = a.C6_SERIE || '';
                    bVal = b.C6_SERIE || '';
                    break;
                case 'nota':
                    aVal = a.C6_NOTA || '';
                    bVal = b.C6_NOTA || '';
                    break;
                case 'date':
                    aVal = a.C6_DATFAT || '';
                    bVal = b.C6_DATFAT || '';
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [billingRecords, searchTerm, selectedPeriods, availablePeriods.periods.length, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRecords.slice(start, start + itemsPerPage);
    }, [filteredRecords, currentPage, itemsPerPage]);

    const handleSort = (field: 'item' | 'value' | 'serie' | 'nota' | 'date') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: 'item' | 'value' | 'serie' | 'nota' | 'date' }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="h-3 w-3 ml-1" />
            : <ArrowDown className="h-3 w-3 ml-1" />;
    };

    // Função para exportar relatório
    const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
        if (!billingData) return;
        
        setIsExporting(true);
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `faturamento-${projectCode}-${timestamp}`;
            
            // Usar todos os registros filtrados ou todos os registros disponíveis
            const dataToExport = {
                ...billingData,
                billing_records: filteredRecords.length > 0 ? filteredRecords : billingData.billing_records,
            } as Parameters<typeof exportBillingToCSV>[0];
            
            switch (format) {
                case 'csv':
                    exportBillingToCSV(dataToExport, filename);
                    break;
                case 'excel':
                    exportBillingToExcel(dataToExport, filename);
                    break;
                case 'pdf':
                    exportBillingToPDF(dataToExport, filename);
                    break;
            }
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Tabela de Faturamento</CardTitle>
                        <CardDescription>
                            Lançamento de provisões (saldo orçamentário) - Projetos parcelados
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {billingData && (
                            <>
                                <Badge variant="secondary" className="text-sm">
                                    {billingData.count} {billingData.count === 1 ? 'parcela' : 'parcelas'}
                                </Badge>
                                <Badge variant="outline" className="text-sm font-semibold">
                                    Total: {formatCurrency(totalBilling)}
                                </Badge>
                            </>
                        )}
                        {billingData && billingData.count > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={isExporting}>
                                        {isExporting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Exportando...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4 mr-2" />
                                                Exportar
                                            </>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Exportar Relatório</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
                                        <File className="h-4 w-4 mr-2" />
                                        Exportar CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('excel')} disabled={isExporting}>
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        Exportar Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Exportar PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Statistics Cards - Minimalista */}
                {billingData && billingData.count > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-300">
                        <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Total Faturado</span>
                            </div>
                            <div className="text-2xl font-bold">{formatCurrency(totalBilling)}</div>
                        </div>
                        
                        <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Parcelas</span>
                            </div>
                            <div className="text-2xl font-bold">{billingData.count}</div>
                        </div>
                        
                        <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Média/Parcela</span>
                            </div>
                            <div className="text-2xl font-bold">
                                {formatCurrency(totalBilling / billingData.count)}
                            </div>
                        </div>
                        
                        <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Períodos</span>
                            </div>
                            <div className="text-2xl font-bold">{availablePeriods.periods.length}</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Filter */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por parcela, série, nota ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                                onClick={() => setSearchTerm('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Period Filter Dropdown */}
                    {availablePeriods.periods.length > 0 && (
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="justify-between min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {isAllSelected 
                                                ? 'Todos os períodos' 
                                                : `${selectedPeriods.size} ${selectedPeriods.size === 1 ? 'mês' : 'meses'}`
                                            }
                                        </span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0" align="start">
                                <div className="p-3 border-b">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={(checked) => {
                                                if (checked) clearAllPeriods();
                                            }}
                                        />
                                        <span className="font-medium">Todos os períodos</span>
                                    </label>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-2">
                                    {availablePeriods.periods.map((period) => {
                                        const periodKey = `${period.year}-${period.month}`;
                                        const isChecked = selectedPeriods.size === 0 || selectedPeriods.has(periodKey);
                                        return (
                                            <label
                                                key={periodKey}
                                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() => {
                                                        if (selectedPeriods.size === 0) {
                                                            // Se estava "Todos", seleciona todos exceto este
                                                            const allExceptThis = new Set(
                                                                availablePeriods.periods
                                                                    .map(p => `${p.year}-${p.month}`)
                                                                    .filter(k => k !== periodKey)
                                                            );
                                                            setSelectedPeriods(allExceptThis);
                                                            setCurrentPage(1);
                                                        } else {
                                                            togglePeriod(periodKey);
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm">{period.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[120px]">
                                    <button
                                        onClick={() => handleSort('item')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        Nº Parcela
                                        <SortIcon field="item" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    <button
                                        onClick={() => handleSort('date')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        Data Faturamento
                                        <SortIcon field="date" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[100px]">
                                    <button
                                        onClick={() => handleSort('serie')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        Série
                                        <SortIcon field="serie" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    <button
                                        onClick={() => handleSort('nota')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        Nota
                                        <SortIcon field="nota" />
                                    </button>
                                </TableHead>
                                <TableHead className="min-w-[200px]">
                                    Descrição
                                </TableHead>
                                <TableHead className="w-[150px] text-right">
                                    <button
                                        onClick={() => handleSort('value')}
                                        className="flex items-center justify-end ml-auto hover:text-foreground transition-colors"
                                    >
                                        Valor da Parcela
                                        <SortIcon field="value" />
                                    </button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                        <TableRow key={`skeleton-${idx}`}>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-destructive">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-8 w-8 text-destructive" />
                                            <p>Erro ao carregar dados de faturamento.</p>
                                            <p className="text-sm text-muted-foreground">Tente novamente mais tarde.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedRecords && paginatedRecords.length > 0 ? (
                                paginatedRecords.map((record: BillingRecord, idx: number) => {
                                    const rowKey = record.R_E_C_N_O_ || `billing-${idx}`;
                                    return (
                                        <TableRow 
                                            key={rowKey} 
                                            className="hover:bg-muted/50 animate-in fade-in duration-200"
                                            style={{ animationDelay: `${idx * 30}ms` }}
                                        >
                                            <TableCell className="font-medium">
                                                {record.C6_ITEM || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {record.C6_DATFAT ? (
                                                    <span className="text-sm font-medium">
                                                        {formatDate(record.C6_DATFAT)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {record.C6_SERIE ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        {record.C6_SERIE}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {record.C6_NOTA ? (
                                                    <span className="text-sm">{record.C6_NOTA}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {record.C6_DESCRI ? (
                                                    <span className="text-sm text-muted-foreground">
                                                        {record.C6_DESCRI}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-sm font-semibold tabular-nums">
                                                    {formatCurrency(record.C6_PRCVEN || 0)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-semibold">Nenhum registro encontrado</p>
                                                <p className="text-sm text-muted-foreground max-w-sm">
                                                    {hasActiveFilters
                                                        ? 'Nenhuma parcela corresponde aos filtros aplicados.'
                                                        : 'Este projeto não possui lançamentos de faturamento.'}
                                                </p>
                                            </div>
                                            {hasActiveFilters && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        clearAllPeriods();
                                                    }}
                                                >
                                                    Limpar Filtros
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {filteredRecords.length > 0 && (
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredRecords.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(newItemsPerPage) => {
                            setItemsPerPage(newItemsPerPage);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
}
