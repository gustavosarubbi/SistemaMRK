'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Activity, User, FileText, Receipt } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { getProjectClassification, getServiceType, getProjectAnalyst } from '@/lib/project-mappings';
import { ProjectTimeline } from '../project-timeline';
import { TrendIndicator } from '../trend-indicator';
import { FinalizationStatus } from '../finalization-status';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface SummaryTabProps {
    project: Project;
    trendData?: {
        budget?: { current: number; previous: number };
        realized?: { current: number; previous: number };
        balance?: { current: number; previous: number };
    };
    trendPeriod?: string;
}

interface BillingResponse {
    project_code: string;
    project_name: string;
    billing_records: any[];
    total_billing: number; // Faturadas (mantido para compatibilidade)
    total_provisions: number; // Todas as provisões
    billed: number; // Provisões faturadas
    pending: number; // Provisões pendentes
    count: number; // Quantidade de parcelas faturadas
}

export function SummaryTab({ project, trendData, trendPeriod = 'vs. mês anterior' }: SummaryTabProps) {
    const budget = project.budget || 0;
    const realized = project.realized || 0;
    const balance = budget - realized; // Orçamento - Realizado
    const usagePercent = budget > 0 ? (realized / budget) * 100 : 0;

    // Fetch billing data para calcular Saldo Financeiro
    const { data: billingData } = useQuery<BillingResponse>({
        queryKey: ['project_billing', project.CTT_CUSTO],
        queryFn: async () => {
            const res = await api.get(`/projects/${project.CTT_CUSTO}/billing`);
            return res.data;
        },
        staleTime: 60000, // 1 minuto
        gcTime: 300000, // 5 minutos
        refetchOnWindowFocus: false,
    });

    // Dados de faturamento
    const totalBilling = billingData?.total_billing || 0; // Faturadas
    const totalProvisions = billingData?.total_provisions || 0; // Todas as provisões
    const billed = billingData?.billed || 0; // Faturadas
    const pending = billingData?.pending || 0; // Pendentes
    const parcelsCount = billingData?.count || 0; // Quantidade de parcelas faturadas
    
    // Calcular Saldo Financeiro: Soma das Parcelas Faturadas - Realizado
    const financialBalance = totalBilling > 0 
        ? totalBilling - realized  // Se tiver parcelas: Parcelas Faturadas - Realizado
        : 0;                        // Se não tiver faturamento: sem valor
    
    // Percentual de faturamento (faturado vs realizado) - similar ao cálculo de orçamentos
    const billingPercent = realized > 0 ? (billed / realized) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* KPIs Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(budget)}</div>
                        {trendData?.budget && (
                            <TrendIndicator
                                currentValue={trendData.budget.current}
                                previousValue={trendData.budget.previous}
                                period={trendPeriod}
                                format="currency"
                                className="mt-1"
                            />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Realizado</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(realized)}</div>
                        {trendData?.realized && (
                            <TrendIndicator
                                currentValue={trendData.realized.current}
                                previousValue={trendData.realized.previous}
                                period={trendPeriod}
                                format="currency"
                                className="mt-1"
                            />
                        )}
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
                        {getProjectAnalyst(project) !== '-' && (
                            <>
                                <div className="text-sm font-medium mt-2 truncate">{getProjectAnalyst(project)}</div>
                                <p className="text-xs text-muted-foreground">Analista</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Details & Status com Orçamentos e Faturamento */}
            <div className="grid gap-6 md:grid-cols-3 items-stretch">
                {/* Left Column: Project Info - Menor */}
                <Card className="md:col-span-1">
                    <CardHeader className="pb-1">
                        <CardTitle className="text-sm">Detalhes do Projeto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 py-1.5">
                        <div className="grid gap-0">
                            <span className="text-xs text-muted-foreground font-medium uppercase">Período de Vigência</span>
                            <ProjectTimeline
                                startDate={project.CTT_DTINI}
                                endDate={project.CTT_DTFIM}
                                isFinalized={project.is_finalized}
                            />
                        </div>
                        
                        <div className="border-t pt-1.5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase">Classe</span>
                                    <div className="text-sm font-medium mt-0">{project.CTT_CLASSE === '1' ? 'Sintético' : 'Analítico'}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase">Tipo Prestação</span>
                                    <div className="text-sm font-medium mt-0">{getServiceType(project.CTT_TPCONV)}</div> 
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-1.5">
                            <FinalizationStatus
                                projectId={project.CTT_CUSTO}
                                isFinalized={project.is_finalized}
                                finalizedAt={project.finalized_at}
                                finalizedBy={project.finalized_by}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Orçamentos e Faturamento + Status */}
                <div className="md:col-span-2 space-y-6 flex flex-col">
                    {/* Cards de Orçamentos e Faturamento lado a lado */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Card de Orçamentos */}
                        <Card className="h-full">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-blue-50">
                                        <DollarSign className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <CardTitle className="text-base">Orçamentos</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-muted-foreground">Orçamento Total</span>
                                        <span className="text-base font-semibold">{formatCurrency(budget)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-muted-foreground">Realizado</span>
                                        <span className="text-base font-semibold">{formatCurrency(realized)}</span>
                                    </div>
                                    <div className="border-t pt-3">
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm font-medium">Saldo Orçamentário</span>
                                            <span className={`text-base font-bold ${balance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                {formatCurrency(balance)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Percentual Utilizado</span>
                                        <span className="text-xs font-semibold">{usagePercent.toFixed(1)}%</span>
                                    </div>
                                    <ProgressBar value={usagePercent} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card de Faturamento */}
                        <Card className="h-full">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-purple-50">
                                        <Receipt className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <CardTitle className="text-base">Faturamento</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {totalProvisions > 0 ? (
                                    <>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm text-muted-foreground">Total de Provisões</span>
                                                <span className="text-base font-semibold">{formatCurrency(totalProvisions)}</span>
                                            </div>

                                            <div className="border-t pt-3">
                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-sm text-muted-foreground">Quantidade de Parcelas</span>
                                                    <span className="text-sm font-semibold">{parcelsCount} {parcelsCount === 1 ? 'parcela' : 'parcelas'}</span>
                                                </div>
                                            </div>

                                            {totalBilling > 0 && (
                                                <div className="border-t pt-3">
                                                    <div className="flex justify-between items-center py-2">
                                                        <span className="text-sm font-medium">Saldo Financeiro</span>
                                                        <span className={`text-base font-bold ${financialBalance < 0 ? 'text-destructive' : financialBalance > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                            {formatCurrency(financialBalance)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Total Faturado - Realizado
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Percentual Faturado</span>
                                                <span className="text-xs font-semibold">{billingPercent.toFixed(1)}%</span>
                                            </div>
                                            <ProgressBar value={billingPercent} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-10">
                                        <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                                            <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Sem provisões cadastradas</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Status - Retângulo compacto */}
                    <Card className="flex-shrink-0">
                        <CardHeader className="pb-1">
                            <CardTitle className="text-sm">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-1.5">
                            <div className="bg-muted/30 rounded-lg p-2.5 border">
                                <div className="grid grid-cols-4 gap-2.5">
                                    <div>
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-0.5">Status</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-block ${project.CTT_BLOQ === '1' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                            {project.CTT_BLOQ === '1' ? 'Bloqueado' : 'Ativo'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-0.5">Código</span>
                                        <div className="text-sm font-semibold">{project.CTT_CUSTO}</div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-0.5">Unidade</span>
                                        <div className="text-sm font-semibold">{project.CTT_UNIDES || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-0.5">Classificação</span>
                                        <div className="text-sm font-semibold">{getProjectClassification(project.CTT_CLAPRJ)}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

