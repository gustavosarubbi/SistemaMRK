'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X, FileText, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

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
    C8_NOTA?: string;
    C6_FILIAL?: string;
}

interface BillingResponse {
    project_code: string;
    project_name: string;
    billing_records: BillingRecord[];
    total_billing: number;
    count: number;
}

export function BillingTab({ projectCode, projectName }: BillingTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<'item' | 'value' | 'serie' | 'nota'>('item');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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

    // Filtered and sorted billing records
    const filteredRecords = useMemo(() => {
        let filtered = billingRecords.filter((record: BillingRecord) => {
            // Search filter
            const matchesSearch = !searchTerm || 
                (record.C6_ITEM && record.C6_ITEM.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (record.C6_SERIE && record.C6_SERIE.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (record.C8_NOTA && record.C8_NOTA.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return matchesSearch;
        });

        // Sorting
        filtered.sort((a: BillingRecord, b: BillingRecord) => {
            let aVal: any, bVal: any;
            
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
                    aVal = a.C8_NOTA || '';
                    bVal = b.C8_NOTA || '';
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [billingRecords, searchTerm, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRecords.slice(start, start + itemsPerPage);
    }, [filteredRecords, currentPage, itemsPerPage]);

    const handleSort = (field: 'item' | 'value' | 'serie' | 'nota') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: 'item' | 'value' | 'serie' | 'nota' }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="h-3 w-3 ml-1" />
            : <ArrowDown className="h-3 w-3 ml-1" />;
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
                    {billingData && (
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-sm">
                                {billingData.count} {billingData.count === 1 ? 'parcela' : 'parcelas'}
                            </Badge>
                            <Badge variant="outline" className="text-sm font-semibold">
                                Total: {formatCurrency(totalBilling)}
                            </Badge>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Statistics Card */}
                {billingData && billingData.count > 0 && (
                    <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Total de Provisões</div>
                                    <div className="text-lg font-semibold">{formatCurrency(totalBilling)}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">Parcelas</div>
                                <div className="text-lg font-semibold">{billingData.count}</div>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <p>Este valor é subtraído do Realizado do projeto para cálculo do saldo orçamentário.</p>
                        </div>
                    </div>
                )}

                {/* Search Filter */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por parcela, série ou nota..."
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

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
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
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <Skeleton className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <span className="text-sm text-muted-foreground">Carregando dados de faturamento...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-destructive">
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
                                        <TableRow key={rowKey} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                {record.C6_ITEM || '-'}
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
                                                {record.C8_NOTA ? (
                                                    <span className="text-sm">{record.C8_NOTA}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="text-sm font-semibold text-blue-600">
                                                    {formatCurrency(record.C6_PRCVEN || 0)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Nenhum registro de faturamento encontrado</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {searchTerm
                                                        ? 'Tente ajustar o filtro de busca'
                                                        : 'Este projeto não possui lançamentos de provisões de faturamento'}
                                                </p>
                                            </div>
                                            {searchTerm && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSearchTerm('')}
                                                >
                                                    Limpar Busca
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

