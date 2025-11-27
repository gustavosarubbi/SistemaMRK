'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Project, PaginatedResponse } from '@/types';
import { Search, Calendar, X, Eye } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectsPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const limit = 10; // Items per page
    
    const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects', search, page, startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            
            const res = await api.get(`/projects?${params.toString()}`);
            return res.data;
        },
        // Keep previous data while fetching new page for better UX
        placeholderData: (previousData) => previousData
    });

    const projects = data?.data || [];
    const totalPages = data?.total_pages || 1;

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1); 
    };

    const clearFilters = () => {
        setSearch('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };
    
    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return '-';
        // YYYYMMDD -> DD/MM/YYYY
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Projetos</h2>
                    <p className="text-muted-foreground">Gerencie e acompanhe o status financeiro dos projetos.</p>
                </div>
            </div>
            
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por projeto, centro de custo ou coordenador..."
                                value={search}
                                onChange={handleSearch}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground pointer-events-none bg-background px-1 -translate-y-5">Início</span>
                                    <Input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                        className="w-full md:w-40"
                                        title="Data Inicial"
                                    />
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground pointer-events-none bg-background px-1 -translate-y-5">Fim</span>
                                    <Input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                        className="w-full md:w-40"
                                        title="Data Final"
                                    />
                                </div>
                            </div>
                            {(search || startDate || endDate) && (
                                <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar Filtros">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Custo</TableHead>
                            <TableHead className="min-w-[200px]">Descrição / Cliente</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Coordenador</TableHead>
                            <TableHead className="text-right">Orçamento</TableHead>
                            <TableHead className="text-right">Realizado</TableHead>
                            <TableHead className="w-[150px]">Status (%)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                        Carregando dados...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                             <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-destructive">
                                    Erro ao carregar projetos. Tente novamente.
                                </TableCell>
                            </TableRow>
                        ) : projects.length > 0 ? (
                            projects.map((project) => (
                                <TableRow key={project.CTT_CUSTO}>
                                    <TableCell className="font-medium">{project.CTT_CUSTO}</TableCell>
                                    <TableCell>
                                        <div className="font-medium truncate max-w-[250px]" title={project.CTT_DESC01}>{project.CTT_DESC01 || 'Sem Descrição'}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[250px]">{project.CTT_UNIDES}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs whitespace-nowrap">
                                            {formatDate(project.CTT_DTINI)} <br/> 
                                            <span className="text-muted-foreground">até</span> {formatDate(project.CTT_DTFIM)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm truncate max-w-[150px]" title={project.CTT_NOMECO}>{project.CTT_NOMECO || '-'}</div>
                                        {(project.CTT_ANADES || project.CTT_ANALIS) && (
                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                Analista: {project.CTT_ANADES || project.CTT_ANALIS}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium whitespace-nowrap">
                                        {formatCurrency(project.budget || 0)}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        {formatCurrency(project.realized || 0)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <ProgressBar value={project.usage_percent || 0} />
                                            <div className="text-xs text-right text-muted-foreground">
                                                {(project.usage_percent || 0).toFixed(1)}%
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/projects/${project.CTT_CUSTO}`}>
                                            <Button variant="ghost" size="icon" title="Ver Detalhes">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                    Nenhum projeto encontrado com os filtros selecionados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                <div className="border-t p-4">
                    <Pagination 
                        page={page} 
                        totalPages={totalPages} 
                        onPageChange={setPage} 
                    />
                </div>
            </div>
        </div>
    )
}
