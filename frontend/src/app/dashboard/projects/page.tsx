'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from '@/components/layout/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from '@/components/ui/pagination';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Project, PaginatedResponse } from '@/types';
import { Search, X, ArrowRight, AlertCircle, FileText, Filter, Calendar, User, Building2, RotateCcw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function ProjectsPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState('');
    const [filterCoordinator, setFilterCoordinator] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [showApprovedOnly, setShowApprovedOnly] = useState(false);
    const limit = 10; // Items per page
    
    const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects', search, page, startDate, endDate, filterCoordinator, filterClient],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (filterCoordinator) params.append('coordinator', filterCoordinator);
            if (filterClient) params.append('client', filterClient);
            
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            
            const res = await api.get(`/projects?${params.toString()}`);
            return res.data;
        },
        // Keep previous data while fetching new page for better UX
        placeholderData: (previousData) => previousData,
        retry: 1, // Limita retries para evitar loops infinitos
        refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
    });

    const allProjects = data?.data || [];
    
    // Filtrar projetos aprovados/não aprovados
    // Um projeto é considerado aprovado se tem budget > 0 e não está bloqueado
    const projects = showApprovedOnly 
        ? allProjects.filter(p => {
            const hasBudget = (p.budget || 0) > 0;
            const isNotBlocked = p.CTT_BLOQ !== 'S' && p.CTT_BLOQ !== '1';
            return hasBudget && isNotBlocked;
        })
        : allProjects;
    
    const totalPages = data?.total_pages || 1;

    // Obter valores únicos para selects (usando todos os dados se disponível, senão apenas os carregados)
    const uniqueCoordinators = Array.from(new Set(projects.map(p => p.CTT_NOMECO).filter((c): c is string => Boolean(c)))).sort();
    const uniqueClients = Array.from(new Set(projects.map(p => p.CTT_UNIDES).filter(Boolean))).sort();

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); 
    };

    const clearFilters = () => {
        setSearch('');
        setStartDate('2023-01-01');
        setEndDate('');
        setFilterCoordinator('');
        setFilterClient('');
        setShowApprovedOnly(false);
        setPage(1);
    };
    
    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return '-';
        // YYYYMMDD -> DD/MM/YYYY
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    };

    const getStatusBadge = (usagePercent: number) => {
        if (usagePercent > 100) {
            return <Badge variant="critical">Excedido</Badge>;
        } else if (usagePercent > 85) {
            return <Badge variant="danger">Crítico</Badge>;
        } else if (usagePercent > 70) {
            return <Badge variant="warning">Atenção</Badge>;
        } else {
            return <Badge variant="success">Em dia</Badge>;
        }
    };

    const activeFiltersCount = [search, endDate, filterCoordinator, filterClient, showApprovedOnly].filter(Boolean).length + (startDate !== '2023-01-01' ? 1 : 0);
    
    const hasActiveFilters = activeFiltersCount > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <PageHeader
                    title="Projetos"
                    description="Gerencie e acompanhe o status financeiro dos projetos"
                    breadcrumbItems={[{ label: 'Projetos' }]}
                />
                {data && (
                    <div className="text-left sm:text-right">
                        <div className="text-2xl font-bold">{data.total || 0}</div>
                        <div className="text-xs text-muted-foreground">Total de projetos</div>
                    </div>
                )}
            </div>
            
            <Card className="border-2 transition-all duration-200">
                <CardHeader className="pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md bg-primary/10">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            Filtros de Busca
                        </CardTitle>
                        {hasActiveFilters && (
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1">
                                    {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                                </Badge>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={clearFilters} 
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    title="Limpar todos os filtros"
                                >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                    Limpar
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {/* Busca */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Projeto, centro de custo..."
                                    value={search}
                                    onChange={handleSearch}
                                    className="pl-9 pr-8 h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors truncate"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-muted rounded-md transition-colors"
                                        onClick={() => { setSearch(''); setPage(1); }}
                                        title="Limpar busca"
                                    >
                                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Coordenador */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                Coordenador
                            </label>
                            <div className="relative">
                                <Select value={filterCoordinator || undefined} onValueChange={(value) => { setFilterCoordinator(value); setPage(1); }}>
                                    <SelectTrigger className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors pr-8 [&>span]:truncate [&>span]:max-w-full">
                                        <SelectValue placeholder="Todos os coordenadores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueCoordinators.length > 0 ? (
                                            uniqueCoordinators.map((coord) => (
                                                <SelectItem key={coord} value={coord}>{coord}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-data" disabled>Nenhum disponível</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {filterCoordinator && (
                                    <button
                                        type="button"
                                        className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-muted rounded-md transition-colors z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setFilterCoordinator('');
                                            setPage(1);
                                        }}
                                        title="Limpar coordenador"
                                    >
                                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Cliente */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                Cliente
                            </label>
                            <div className="relative">
                                <Select value={filterClient || undefined} onValueChange={(value) => { setFilterClient(value); setPage(1); }}>
                                    <SelectTrigger className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors pr-8 [&>span]:truncate [&>span]:max-w-full">
                                        <SelectValue placeholder="Todos os clientes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueClients.length > 0 ? (
                                            uniqueClients.map((client) => (
                                                <SelectItem key={client} value={client}>{client}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-data" disabled>Nenhum disponível</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {filterClient && (
                                    <button
                                        type="button"
                                        className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-muted rounded-md transition-colors z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setFilterClient('');
                                            setPage(1);
                                        }}
                                        title="Limpar cliente"
                                    >
                                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Data Início */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                Data Início
                            </label>
                            <Input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors"
                            />
                        </div>

                        {/* Data Fim */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                Data Fim
                            </label>
                            <Input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Toggle Aprovados/Não Aprovados */}
                    <div className="mt-5 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor="approved-toggle" className="text-sm font-medium cursor-pointer">
                                        Apenas projetos aprovados
                                    </Label>
                                </div>
                            </div>
                            <Switch
                                id="approved-toggle"
                                checked={showApprovedOnly}
                                onCheckedChange={(checked) => {
                                    setShowApprovedOnly(checked);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 ml-7">
                            {showApprovedOnly 
                                ? 'Exibindo apenas projetos com orçamento aprovado e não bloqueados'
                                : 'Exibindo todos os projetos (aprovados e não aprovados)'}
                        </p>
                    </div>

                    {/* Tags de Filtros Ativos */}
                    {hasActiveFilters && (
                        <div className="mt-5 pt-4 border-t">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Filtros aplicados:</span>
                                {search && (
                                    <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                        Busca: "{search}"
                                        <button
                                            onClick={() => { setSearch(''); setPage(1); }}
                                            className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filterCoordinator && (
                                    <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                        Coordenador: {filterCoordinator}
                                        <button
                                            onClick={() => { setFilterCoordinator(''); setPage(1); }}
                                            className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filterClient && (
                                    <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                        Cliente: {filterClient}
                                        <button
                                            onClick={() => { setFilterClient(''); setPage(1); }}
                                            className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {startDate !== '2023-01-01' && (
                                    <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                        Início: {new Date(startDate).toLocaleDateString('pt-BR')}
                                        <button
                                            onClick={() => { setStartDate('2023-01-01'); setPage(1); }}
                                            className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {endDate && (
                                    <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                        Fim: {new Date(endDate).toLocaleDateString('pt-BR')}
                                        <button
                                            onClick={() => { setEndDate(''); setPage(1); }}
                                            className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {showApprovedOnly && (
                                    <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                        Apenas aprovados
                                        <button
                                            onClick={() => { setShowApprovedOnly(false); setPage(1); }}
                                            className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[90px]">Custo</TableHead>
                                <TableHead className="min-w-[180px]">Descrição / Cliente</TableHead>
                                <TableHead className="w-[120px]">Período</TableHead>
                                <TableHead className="w-[140px]">Coordenador</TableHead>
                                <TableHead className="text-right w-[120px]">Orçamento</TableHead>
                                <TableHead className="text-right w-[120px]">Realizado</TableHead>
                                <TableHead className="w-[160px]">Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="py-2"><Skeleton className="h-3 w-16" /></TableCell>
                                        <TableCell className="py-2">
                                            <Skeleton className="h-3 w-40 mb-1.5" />
                                            <Skeleton className="h-2.5 w-28" />
                                        </TableCell>
                                        <TableCell className="py-2"><Skeleton className="h-3 w-20" /></TableCell>
                                        <TableCell className="py-2"><Skeleton className="h-3 w-28" /></TableCell>
                                        <TableCell className="text-right py-2"><Skeleton className="h-3 w-20 ml-auto" /></TableCell>
                                        <TableCell className="text-right py-2"><Skeleton className="h-3 w-20 ml-auto" /></TableCell>
                                        <TableCell className="py-2"><Skeleton className="h-6 w-full" /></TableCell>
                                        <TableCell className="py-2"><Skeleton className="h-6 w-6 rounded" /></TableCell>
                                    </TableRow>
                                ))
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 py-4">
                                            <AlertCircle className="h-8 w-8 text-destructive" />
                                            <div>
                                                <p className="font-medium text-destructive">Erro ao carregar projetos</p>
                                                <p className="text-sm text-muted-foreground mt-1">Tente novamente em alguns instantes</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                                Tentar novamente
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : projects.length > 0 ? (
                                projects.map((project) => {
                                    const usagePercent = project.usage_percent || 0;
                                    return (
                                        <TableRow key={project.CTT_CUSTO} className="group">
                                            <TableCell className="font-semibold text-xs py-2">{project.CTT_CUSTO}</TableCell>
                                            <TableCell className="py-2">
                                                <div className="font-medium text-xs truncate max-w-[180px]" title={project.CTT_DESC01}>
                                                    {project.CTT_DESC01 || 'Sem Descrição'}
                                                </div>
                                                {project.CTT_UNIDES && (
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                                                        {project.CTT_UNIDES}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-xs whitespace-nowrap">
                                                    {formatDate(project.CTT_DTINI)} <br/> 
                                                    <span className="text-muted-foreground text-[10px]">até</span> {formatDate(project.CTT_DTFIM)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-xs font-medium truncate max-w-[140px]" title={project.CTT_NOMECO}>
                                                    {project.CTT_NOMECO || '-'}
                                                </div>
                                                {(project.CTT_ANADES || project.CTT_ANALIS) && (
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5">
                                                        Analista: {project.CTT_ANADES || project.CTT_ANALIS}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right py-2">
                                                <div className="font-semibold text-xs whitespace-nowrap">
                                                    {formatCurrency(project.budget || 0)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right py-2">
                                                <div className="text-xs whitespace-nowrap">
                                                    {formatCurrency(project.realized || 0)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="space-y-1.5 min-w-[140px]">
                                                    <ProgressBar value={usagePercent} />
                                                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                                        <div className="text-[10px] font-medium whitespace-nowrap">
                                                            {usagePercent.toFixed(1)}%
                                                        </div>
                                                        <div className="flex-shrink-0 scale-90">
                                                            {getStatusBadge(usagePercent)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Link href={`/dashboard/projects/${project.CTT_CUSTO}`}>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 hover:bg-primary/10"
                                                        title="Ver Detalhes"
                                                    >
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 py-8">
                                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                                            <div>
                                                <p className="font-medium text-foreground">Nenhum projeto encontrado</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {activeFiltersCount > 0 
                                                        ? 'Tente ajustar os filtros selecionados'
                                                        : 'Não há projetos cadastrados no momento'}
                                                </p>
                                            </div>
                                            {activeFiltersCount > 0 && (
                                                <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 text-xs">
                                                    Limpar filtros
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {projects.length > 0 && (
                    <div className="border-t bg-muted/30 px-4 py-3">
                        <Pagination 
                            page={page} 
                            totalPages={totalPages} 
                            onPageChange={setPage} 
                        />
                    </div>
                )}
            </Card>
        </div>
    )
}
