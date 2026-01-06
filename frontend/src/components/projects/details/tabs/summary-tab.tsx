'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Activity, User, FileText, Receipt, Briefcase, Building, Layers, Calendar, Clock } from 'lucide-react';
import { Project } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { getProjectClassification, getServiceType, getProjectAnalyst } from '@/lib/project-mappings';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectTimeline } from '../project-timeline';
import { FinalizationStatus } from '../finalization-status';

interface SummaryTabProps {
    project: Project;
    trendData?: any;
    trendPeriod?: string;
}

interface BillingResponse {
    project_code: string;
    total_billing: number; // Faturadas
    total_provisions: number; // Todas as provisões
    billed: number; // Provisões faturadas
    pending: number; // Provisões pendentes
}

interface MetricCardProps {
    title: string;
    value: number;
    subValue?: string;
    isLoading?: boolean;
    valueColor?: string;
    icon?: React.ReactNode;
    borderColor?: string;
}

function MetricCard({ title, value, subValue, isLoading, valueColor, icon, borderColor }: MetricCardProps) {
    return (
        <Card className={`relative overflow-hidden border-l-4 ${borderColor || 'border-l-primary/20'} shadow-sm hover:shadow-md transition-all duration-200`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {title}
                </CardTitle>
                {icon && <div className="text-muted-foreground/40">{icon}</div>}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-9 w-32" />
                ) : (
                    <div className={`text-2xl font-bold tracking-tight ${valueColor || ''}`}>
                        {formatCurrency(value)}
                    </div>
                )}
                {subValue && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center font-medium">
                        {subValue}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function IdentityItem({ label, value, icon, subValue }: { label: string, value: string, icon: React.ReactNode, subValue?: string }) {
    return (
        <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="mt-0.5 p-2 bg-primary/5 rounded-full text-primary ring-1 ring-primary/10">
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-foreground/90">{value}</p>
                {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
            </div>
        </div>
    );
}

export function SummaryTab({ project }: SummaryTabProps) {
    // Fetch Billing Data first (needed for calculations)
    const { data: billingData, isLoading: isLoadingBilling } = useQuery<BillingResponse>({
        queryKey: ['project_billing', project.CTT_CUSTO],
        queryFn: async () => {
            const res = await api.get(`/projects/${project.CTT_CUSTO}/billing`);
            return res.data;
        },
        staleTime: 60000,
    });

    // 1. Visão Orçamentária
    const totalOrcado = project.budget || 0;
    const totalFaturado = billingData?.total_billing || 0;
    const orcamentoRecebido = totalFaturado; // = Total Faturado
    const orcamentoAReceber = totalOrcado - totalFaturado; // = Total Orçado - Total Faturado

    // 2. Visão Financeira
    const saldoDisponivel = totalFaturado; // = Total Faturado
    const financeiroUtilizado = project.realized || 0; // Realizado (mantém)
    const saldoFinanceiro = saldoDisponivel - financeiroUtilizado; // = Saldo Disponível - Realizado

    // 3. Visão Faturamento
    const faturamentoAReceber = 0; // Ainda não definido
    const aFaturar = totalOrcado - totalFaturado; // = Total Orçado - Total Faturado

    const analystName = getProjectAnalyst(project);

    return (
        <div className="space-y-3 animate-in fade-in duration-700">
            {/* COMMAND CENTER CARD */}
            <Card className="overflow-hidden border-none shadow-lg bg-white">

                {/* HEADER COMPACTO */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 px-6 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-md text-primary">
                                <Briefcase className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Resumo Executivo</h2>
                                <p className="text-base font-medium text-slate-500">Visão consolidada do projeto</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("px-2.5 py-0.5 text-xs font-bold uppercase", project.CTT_BLOQ === '1' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                                {project.CTT_BLOQ === '1' ? 'Bloqueado' : 'Ativo'}
                            </Badge>
                            <Badge className="bg-slate-800 text-white hover:bg-slate-900 px-2.5 py-0.5 text-xs font-bold uppercase">
                                {getServiceType(project.CTT_TPCONV)}
                            </Badge>
                        </div>
                    </div>

                    {/* Identidade Grid - Compacto */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-200/50">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                <User className="h-4 w-4" /> Coordenador
                            </label>
                            <p className="font-bold text-base text-slate-900 truncate" title={project.CTT_NOMECO}>{project.CTT_NOMECO || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Activity className="h-4 w-4" /> Analista
                            </label>
                            <p className="font-bold text-base text-slate-900 truncate" title={analystName}>{analystName !== '-' ? analystName : 'Não atribuído'}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Building className="h-4 w-4" /> Cliente
                            </label>
                            <p className="font-bold text-base text-slate-900 truncate" title={project.CTT_UNIDES}>{project.CTT_UNIDES || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Layers className="h-4 w-4" /> Classificação
                            </label>
                            <p className="font-bold text-base text-slate-900 truncate">{getProjectClassification(project.CTT_CLAPRJ)}</p>
                        </div>
                    </div>
                </div>

                {/* TIMELINE STRIP - Mais Compacto */}
                <div className="px-6 py-5 bg-white border-b border-slate-100">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
                        <div className="flex-1 w-full">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" /> Cronograma
                                </span>
                            </div>
                            <ProjectTimeline
                                startDate={project.CTT_DTINI}
                                endDate={project.CTT_DTFIM}
                                isFinalized={project.is_finalized}
                            />
                        </div>
                        <div className="w-full lg:w-auto shrink-0 lg:border-l lg:pl-5 border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                                <Activity className="h-4 w-4" /> Status do Projeto
                            </span>
                            <FinalizationStatus
                                projectId={project.CTT_CUSTO}
                                isFinalized={project.is_finalized}
                                finalizedAt={project.finalized_at}
                                finalizedBy={project.finalized_by}
                            />
                        </div>
                    </div>
                </div>

                {/* METRICS GRID - Proporções Balanceadas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

                    {/* ORÇAMENTÁRIO */}
                    <div className="p-5 space-y-5 hover:bg-blue-50/20 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Orçamentário</h3>
                        </div>

                        <div className="space-y-1">
                            <span className="text-sm font-bold text-slate-600 uppercase">Total Orçado</span>
                            <div className="text-3xl font-bold text-blue-900">{formatCurrency(totalOrcado)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-100">
                            <div className="bg-blue-50/50 rounded-md p-2.5">
                                <span className="text-xs font-bold text-blue-600 uppercase block mb-1 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    Recebido
                                </span>
                                <div className="text-base font-bold text-blue-700">{formatCurrency(orcamentoRecebido)}</div>
                                <span className="text-[10px] text-red-500 font-semibold">⚠ Indisponível</span>
                            </div>
                            <div className="bg-blue-50/50 rounded-md p-2.5">
                                <span className="text-xs font-bold text-blue-600 uppercase block mb-1 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                    A Receber
                                </span>
                                <div className="text-base font-bold text-blue-700">{formatCurrency(orcamentoAReceber)}</div>
                                <span className="text-[10px] text-red-500 font-semibold">⚠ Indisponível</span>
                            </div>
                        </div>
                    </div>

                    {/* FINANCEIRO */}
                    <div className="p-5 space-y-5 hover:bg-emerald-50/20 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                                <Activity className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Financeiro</h3>
                        </div>

                        <div className="space-y-1">
                            <span className="text-sm font-bold text-slate-600 uppercase">Saldo Disponível</span>
                            <div className={cn("text-3xl font-bold", saldoFinanceiro < 0 ? "text-red-600" : "text-emerald-700")}>
                                {formatCurrency(saldoFinanceiro)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-100">
                            <div className="bg-slate-50 rounded-md p-2.5">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Realizado</span>
                                <div className="text-base font-bold text-slate-700">{formatCurrency(financeiroUtilizado)}</div>
                            </div>
                            <div className={cn("rounded-md p-2.5", saldoFinanceiro < 0 ? "bg-red-50/50" : "bg-emerald-50/50")}>
                                <span className={cn("text-xs font-bold uppercase block mb-1 flex items-center gap-1.5", saldoFinanceiro < 0 ? "text-red-600" : "text-emerald-600")}>
                                    <div className={cn("w-2 h-2 rounded-full", saldoFinanceiro < 0 ? "bg-red-500" : "bg-emerald-500")}></div>
                                    Saldo Financeiro
                                </span>
                                <div className={cn("text-base font-bold", saldoFinanceiro < 0 ? "text-red-700" : "text-emerald-700")}>{formatCurrency(saldoFinanceiro)}</div>
                            </div>
                        </div>
                    </div>

                    {/* FATURAMENTO */}
                    <div className="p-5 space-y-5 hover:bg-purple-50/20 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-md">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Faturamento</h3>
                        </div>

                        <div className="space-y-1">
                            <span className="text-sm font-bold text-slate-600 uppercase">Total Faturado</span>
                            <div className="text-3xl font-bold text-purple-900">
                                {isLoadingBilling ? <Skeleton className="h-9 w-32" /> : formatCurrency(totalFaturado)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-100">
                            <div className="bg-slate-50 rounded-md p-2.5">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">A Faturar</span>
                                <div className="text-base font-bold text-slate-700">
                                    {isLoadingBilling ? <Skeleton className="h-6 w-24" /> : formatCurrency(aFaturar)}
                                </div>
                            </div>
                            <div className="bg-purple-50/50 rounded-md p-2.5">
                                <span className="text-xs font-bold text-purple-600 uppercase block mb-1 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    A Receber
                                </span>
                                <div className="text-base font-bold text-purple-700">{formatCurrency(faturamentoAReceber)}</div>
                                <span className="text-[10px] text-red-400 font-medium">Indisponível</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
