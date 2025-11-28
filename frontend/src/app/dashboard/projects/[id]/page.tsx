'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { ArrowLeft, Calendar, User, DollarSign, TrendingUp, Activity, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function ProjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // Fetch Project Details
    const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
        queryKey: ['project', id],
        queryFn: async () => {
            const res = await api.get(`/projects/${id}`);
            return res.data;
        },
        retry: 1, // Limita retries para evitar loops infinitos
        refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
    });

    // Fetch Movements (Expenses)
    const { data: movements, isLoading: isLoadingMovements, error: movementsError } = useQuery<any[]>({
        queryKey: ['project_movements', id],
        queryFn: async () => {
            try {
                const res = await api.get(`/movements/${id}`);
                return res.data || [];
            } catch (error) {
                console.error('Erro ao carregar movimentações:', error);
                return [];
            }
        },
        retry: 1, // Limita retries para evitar loops infinitos
        refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
    });

    // Filters and sorting state
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<'date' | 'value' | 'type'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    
    // Get unique types for filter
    const uniqueTypes = useMemo(() => {
        if (!movements) return [];
        const types = new Set(movements.map((m: any) => m.PAC_TIPO).filter(Boolean));
        return Array.from(types).sort();
    }, [movements]);

    // Filtered and sorted movements
    const filteredMovements = useMemo(() => {
        if (!movements) return [];
        
        let filtered = movements.filter((mov: any) => {
            // Search filter
            const matchesSearch = !searchTerm || 
                (mov.PAC_HISTOR && mov.PAC_HISTOR.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (mov.PAC_TIPO && mov.PAC_TIPO.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (mov.PAC_DOCUME && mov.PAC_DOCUME.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // Type filter
            const matchesType = typeFilter === 'all' || mov.PAC_TIPO === typeFilter;
            
            return matchesSearch && matchesType;
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
    }, [movements, searchTerm, typeFilter, sortField, sortDirection]);

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
    
    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return '-';
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    };

    if (isLoadingProject) {
        return (
            <div className="flex items-center justify-center h-96">
                 <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    Carregando detalhes do projeto...
                </div>
            </div>
        );
    }

    if (!project || !project.CTT_CUSTO) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <p className="text-muted-foreground">Projeto não encontrado.</p>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        );
    }
    
    // Calculate derived data
    const budget = project.budget || 0;
    const realized = project.realized || 0;
    const balance = budget - realized;
    const usagePercent = budget > 0 ? (realized / budget) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <PageHeader
                    title={project.CTT_DESC01 || 'Detalhes do Projeto'}
                    description={`Código: ${project.CTT_CUSTO}${project.CTT_UNIDES ? ` • ${project.CTT_UNIDES}` : ''}`}
                    breadcrumbItems={[
                        { label: 'Projetos', href: '/dashboard/projects' },
                        { label: project.CTT_DESC01 || 'Detalhes' }
                    ]}
                />
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${project.CTT_BLOQ === '1' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {project.CTT_BLOQ === '1' ? 'Bloqueado' : 'Ativo'}
                    </span>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(budget)}</div>
                        <p className="text-xs text-muted-foreground">
                            Planejado (PAD)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Realizado</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(realized)}</div>
                        <p className="text-xs text-muted-foreground">
                            Total de Despesas (PAC)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(balance)}
                        </div>
                         <div className="mt-2">
                            <ProgressBar value={usagePercent} />
                            <p className="text-xs text-right mt-1 text-muted-foreground">{usagePercent.toFixed(1)}% Utilizado</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gestão</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium truncate">{project.CTT_NOMECO || 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">Coordenador</p>
                        {(project.CTT_ANADES || project.CTT_ANALIS) && (
                            <>
                                <div className="text-sm font-medium mt-2 truncate">{project.CTT_ANADES || project.CTT_ANALIS}</div>
                                <p className="text-xs text-muted-foreground">Analista</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Details & Movements */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Project Info */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Detalhes do Projeto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase">Período de Vigência</span>
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDate(project.CTT_DTINI)}</span>
                                <span className="text-muted-foreground">até</span>
                                <span>{formatDate(project.CTT_DTFIM)}</span>
                            </div>
                        </div>
                        
                        <div className="border-t pt-4 mt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase">Classe</span>
                                    <div className="text-sm font-medium mt-1">{project.CTT_CLASSE === '1' ? 'Sintético' : 'Analítico'}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase">Tipo</span>
                                    <div className="text-sm font-medium mt-1">Operacional</div> 
                                </div>
                            </div>
                        </div>

                        {project.initial_balance !== undefined && project.initial_balance > 0 && (
                            <div className="border-t pt-4 mt-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase">Orçamento Inicial (CTT)</span>
                                <div className="text-sm font-medium mt-1">{formatCurrency(project.initial_balance)}</div>
                                <p className="text-[10px] text-muted-foreground">Valor original no cadastro do centro de custo.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Column: Movements Table */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Movimentações Financeiras</CardTitle>
                                <CardDescription>Gestão completa dos lançamentos registrados no projeto (PAC).</CardDescription>
                            </div>
                            {filteredMovements.length > 0 && (
                                <Badge variant="secondary" className="text-sm">
                                    {filteredMovements.length} {filteredMovements.length === 1 ? 'registro' : 'registros'}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Statistics Cards */}
                        {filteredMovements.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
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
                                    {isLoadingMovements ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8">
                                                <div className="flex justify-center gap-2 text-muted-foreground">
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                                    Carregando...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : movementsError ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-destructive">
                                                Erro ao carregar movimentações. Tente novamente.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredMovements && filteredMovements.length > 0 ? (
                                        filteredMovements.map((mov: any, idx: number) => (
                                            <TableRow key={mov.R_E_C_N_O_ || idx} className="hover:bg-muted/50">
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
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                {searchTerm || typeFilter !== 'all' 
                                                    ? 'Nenhuma movimentação encontrada com os filtros aplicados.'
                                                    : 'Nenhuma movimentação encontrada para este projeto.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Footer Info */}
                        {filteredMovements.length > 0 && (
                            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                                Exibindo {filteredMovements.length} de {movements?.length || 0} movimentações. 
                                {searchTerm || typeFilter !== 'all' ? ' Filtros aplicados.' : ''}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

