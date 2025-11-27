'use client';

import React from 'react'; // Ensure React is imported if needed, usually implicit in Next.js 13+
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Calendar, User, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Project } from '@/types';
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
        }
    });

    // Fetch Movements (Expenses)
    const { data: movements, isLoading: isLoadingMovements } = useQuery<any[]>({
        queryKey: ['project_movements', id],
        queryFn: async () => {
            const res = await api.get(`/movements/${id}`);
            return res.data;
        }
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{project.CTT_DESC01}</h2>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{project.CTT_CUSTO}</span>
                            {project.CTT_UNIDES && <span>• {project.CTT_UNIDES}</span>}
                        </p>
                    </div>
                </div>
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
                        <CardTitle>Movimentações Financeiras</CardTitle>
                        <CardDescription>Últimos lançamentos registrados no projeto (PAC).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Data</TableHead>
                                        <TableHead>Histórico</TableHead>
                                        <TableHead className="w-[80px]">Tipo</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
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
                                    ) : movements && movements.length > 0 ? (
                                        movements.map((mov: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-xs font-medium">{formatDate(mov.PAC_DATA)}</TableCell>
                                                <TableCell className="text-xs truncate max-w-[250px]" title={mov.PAC_HISTOR}>
                                                    {mov.PAC_HISTOR || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">{mov.PAC_TIPO || '-'}</TableCell>
                                                <TableCell className="text-xs text-right font-medium">{formatCurrency(mov.PAC_VALOR)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Nenhuma movimentação encontrada para este projeto.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground text-center">
                            Exibindo as movimentações mais recentes. Para ver o histórico completo, solicite um relatório detalhado.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

