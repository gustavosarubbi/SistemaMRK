'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DateRangeFilter } from '../date-range-filter';
import { ExportButton } from '../export-button';

interface MovementsTabProps {
    movements: any[];
    isLoading: boolean;
    error: any;
    formatDate: (dateStr: string) => string;
    projectName: string;
    projectCode: string;
}

export function MovementsTab({ movements, isLoading, error, formatDate, projectName, projectCode }: MovementsTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<'date' | 'value' | 'type'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [dateFrom, setDateFrom] = useState<Date | undefined>();
    const [dateTo, setDateTo] = useState<Date | undefined>();
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Get unique types for filter
    const uniqueTypes = useMemo(() => {
        const types = new Set(movements.map((m: any) => m.PAC_TIPO).filter(Boolean));
        return Array.from(types).sort();
    }, [movements]);

    // Filtered and sorted movements
    const filteredMovements = useMemo(() => {
        let filtered = movements.filter((mov: any) => {
            // Search filter
            const matchesSearch = !searchTerm || 
                (mov.PAC_HISTOR && mov.PAC_HISTOR.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (mov.PAC_TIPO && mov.PAC_TIPO.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (mov.PAC_DOCUME && mov.PAC_DOCUME.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // Type filter
            const matchesType = typeFilter === 'all' || mov.PAC_TIPO === typeFilter;
            
            // Date filter
            let matchesDate = true;
            if (dateFrom || dateTo) {
                if (mov.PAC_DATA && mov.PAC_DATA.length === 8) {
                    const movDate = new Date(
                        parseInt(mov.PAC_DATA.substring(0, 4)),
                        parseInt(mov.PAC_DATA.substring(4, 6)) - 1,
                        parseInt(mov.PAC_DATA.substring(6, 8))
                    );
                    if (dateFrom && movDate < dateFrom) matchesDate = false;
                    if (dateTo && movDate > dateTo) matchesDate = false;
                } else {
                    matchesDate = false;
                }
            }
            
            return matchesSearch && matchesType && matchesDate;
        });

        // Sorting
        filtered.sort((a: any, b: any) => {
            let aVal: any, bVal: any;
            
            switch (sortField) {
                case 'date':
                    aVal = a.PAC_DATA || '';
                    bVal = b.PAC_DATA || '';
                    break;
                case 'value':
                    aVal = a.PAC_VALOR || 0;
                    bVal = b.PAC_VALOR || 0;
                    break;
                case 'type':
                    aVal = a.PAC_TIPO || '';
                    bVal = b.PAC_TIPO || '';
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [movements, searchTerm, typeFilter, sortField, sortDirection, dateFrom, dateTo]);

    // Pagination
    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const paginatedMovements = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMovements.slice(start, start + itemsPerPage);
    }, [filteredMovements, currentPage, itemsPerPage]);

    // Statistics
    const stats = useMemo(() => {
        if (!filteredMovements || filteredMovements.length === 0) {
            return {
                total: 0,
                count: 0,
                average: 0,
                max: 0,
                min: 0,
            };
        }

        const values = filteredMovements.map((m: any) => m.PAC_VALOR || 0);
        const total = values.reduce((sum, val) => sum + val, 0);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const average = total / values.length;

        return {
            total,
            count: filteredMovements.length,
            average,
            max,
            min,
        };
    }, [filteredMovements]);

    const handleSort = (field: 'date' | 'value' | 'type') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: 'date' | 'value' | 'type' }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="h-3 w-3 ml-1" />
            : <ArrowDown className="h-3 w-3 ml-1" />;
    };

    const toggleRow = (idx: number) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(idx)) {
            newSet.delete(idx);
        } else {
            newSet.add(idx);
        }
        setExpandedRows(newSet);
    };

    const clearDateFilter = () => {
        setDateFrom(undefined);
        setDateTo(undefined);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Movimentações Financeiras</CardTitle>
                        <CardDescription>Gestão completa dos lançamentos registrados no projeto (PAC).</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {filteredMovements.length > 0 && (
                            <Badge variant="secondary" className="text-sm">
                                {filteredMovements.length} {filteredMovements.length === 1 ? 'registro' : 'registros'}
                            </Badge>
                        )}
                        <ExportButton
                            movements={filteredMovements}
                            projectName={projectName}
                            projectCode={projectCode}
                            formatDate={formatDate}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Statistics Cards */}
                {filteredMovements.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Total</div>
                            <div className="text-sm font-semibold">{formatCurrency(stats.total)}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Média</div>
                            <div className="text-sm font-semibold">{formatCurrency(stats.average)}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Maior</div>
                            <div className="text-sm font-semibold text-green-600">{formatCurrency(stats.max)}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Menor</div>
                            <div className="text-sm font-semibold text-orange-600">{formatCurrency(stats.min)}</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="space-y-3">
                    <DateRangeFilter
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onDateFromChange={setDateFrom}
                        onDateToChange={setDateTo}
                        onClear={clearDateFilter}
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por histórico, tipo ou documento..."
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
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filtrar por tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os tipos</SelectItem>
                                {uniqueTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[110px]">
                                    <button
                                        onClick={() => handleSort('date')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        Data
                                        <SortIcon field="date" />
                                    </button>
                                </TableHead>
                                <TableHead>Histórico</TableHead>
                                <TableHead className="w-[100px]">
                                    <button
                                        onClick={() => handleSort('type')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        Tipo
                                        <SortIcon field="type" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px] text-right">
                                    <button
                                        onClick={() => handleSort('value')}
                                        className="flex items-center justify-end ml-auto hover:text-foreground transition-colors"
                                    >
                                        Valor
                                        <SortIcon field="value" />
                                    </button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <div className="flex justify-center gap-2 text-muted-foreground">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            Carregando...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-destructive">
                                        Erro ao carregar movimentações. Tente novamente.
                                    </TableCell>
                                </TableRow>
                            ) : paginatedMovements && paginatedMovements.length > 0 ? (
                                paginatedMovements.map((mov: any, idx: number) => {
                                    const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                                    const isExpanded = expandedRows.has(globalIdx);
                                    const rowKey = mov.R_E_C_N_O_ || `mov-${globalIdx}`;
                                    return (
                                        <React.Fragment key={rowKey}>
                                            <TableRow
                                                className="hover:bg-muted/50 cursor-pointer"
                                                onClick={() => toggleRow(globalIdx)}
                                            >
                                                <TableCell>
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        {formatDate(mov.PAC_DATA)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs truncate max-w-[300px]" title={mov.PAC_HISTOR}>
                                                        {mov.PAC_HISTOR || '-'}
                                                    </div>
                                                    {mov.PAC_DOCUME && (
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                                            Doc: {mov.PAC_DOCUME}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {mov.PAC_TIPO ? (
                                                        <Badge variant="outline" className="text-xs">
                                                            {mov.PAC_TIPO}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className={`text-sm font-semibold ${(mov.PAC_VALOR || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(mov.PAC_VALOR)}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && (
                                                <TableRow key={`${rowKey}-expanded`}>
                                                    <TableCell colSpan={5} className="bg-muted/30">
                                                        <div className="p-4 space-y-2">
                                                            <div>
                                                                <strong className="text-xs text-muted-foreground">Histórico completo:</strong>
                                                                <p className="text-sm mt-1">{mov.PAC_HISTOR || '-'}</p>
                                                            </div>
                                                            {mov.PAC_DOCUME && (
                                                                <div>
                                                                    <strong className="text-xs text-muted-foreground">Documento:</strong>
                                                                    <p className="text-sm mt-1">{mov.PAC_DOCUME}</p>
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                                                <div>
                                                                    <strong className="text-xs text-muted-foreground">Data:</strong>
                                                                    <p className="text-sm mt-1">{formatDate(mov.PAC_DATA)}</p>
                                                                </div>
                                                                <div>
                                                                    <strong className="text-xs text-muted-foreground">Tipo:</strong>
                                                                    <p className="text-sm mt-1">{mov.PAC_TIPO || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                <Calendar className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Nenhuma movimentação encontrada</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {searchTerm || typeFilter !== 'all' || dateFrom || dateTo
                                                        ? 'Tente ajustar os filtros aplicados'
                                                        : 'Este projeto ainda não possui lançamentos financeiros'}
                                                </p>
                                            </div>
                                            {(searchTerm || typeFilter !== 'all' || dateFrom || dateTo) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setTypeFilter('all');
                                                        clearDateFilter();
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
                {filteredMovements.length > 0 && (
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredMovements.length}
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

