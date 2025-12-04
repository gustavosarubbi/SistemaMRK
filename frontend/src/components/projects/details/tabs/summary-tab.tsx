'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Activity, TrendingUp, User, Calendar } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Project } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { getProjectClassification, getServiceType } from '@/lib/project-mappings';
import { ProjectTimeline } from '../project-timeline';
import { TrendIndicator } from '../trend-indicator';

interface SummaryTabProps {
    project: Project;
    trendData?: {
        budget?: { current: number; previous: number };
        realized?: { current: number; previous: number };
        balance?: { current: number; previous: number };
    };
    trendPeriod?: string;
}

export function SummaryTab({ project, trendData, trendPeriod = 'vs. mês anterior' }: SummaryTabProps) {
    const budget = project.budget || 0;
    const realized = project.realized || 0;
    const balance = budget - realized;
    const usagePercent = budget > 0 ? (realized / budget) * 100 : 0;

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return '-';
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    };

    return (
        <div className="space-y-6">
            {/* KPIs Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                        <p className="text-xs text-muted-foreground mt-1">
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
                        {trendData?.realized && (
                            <TrendIndicator
                                currentValue={trendData.realized.current}
                                previousValue={trendData.realized.previous}
                                period={trendPeriod}
                                format="currency"
                                className="mt-1"
                            />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
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
                        {trendData?.balance && (
                            <TrendIndicator
                                currentValue={trendData.balance.current}
                                previousValue={trendData.balance.previous}
                                period={trendPeriod}
                                format="currency"
                                className="mt-1"
                            />
                        )}
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

            {/* Details & Timeline */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Project Info */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Detalhes do Projeto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase">Período de Vigência</span>
                            <ProjectTimeline
                                startDate={project.CTT_DTINI}
                                endDate={project.CTT_DTFIM}
                            />
                        </div>
                        
                        <div className="border-t pt-4 mt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase">Classe</span>
                                    <div className="text-sm font-medium mt-1">{project.CTT_CLASSE === '1' ? 'Sintético' : 'Analítico'}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase">Tipo Prestação</span>
                                    <div className="text-sm font-medium mt-1">{getServiceType(project.CTT_TPCONV)}</div> 
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase">Classificação do Projeto</span>
                                    <div className="text-sm font-medium mt-1">{getProjectClassification(project.CTT_CLAPRJ)}</div>
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

                {/* Right Column: Status & Summary */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Status e Resumo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full border ${project.CTT_BLOQ === '1' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {project.CTT_BLOQ === '1' ? 'Bloqueado' : 'Ativo'}
                            </span>
                            {project.CTT_UNIDES && (
                                <Badge variant="outline">{project.CTT_UNIDES}</Badge>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase">Código</span>
                                <div className="text-sm font-medium mt-1">{project.CTT_CUSTO}</div>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase">Unidade</span>
                                <div className="text-sm font-medium mt-1">{project.CTT_UNIDES || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <span className="text-xs text-muted-foreground font-medium uppercase">Resumo Financeiro</span>
                            <div className="mt-2 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Orçamento:</span>
                                    <span className="font-medium">{formatCurrency(budget)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Realizado:</span>
                                    <span className="font-medium">{formatCurrency(realized)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-2">
                                    <span className="text-muted-foreground">Saldo:</span>
                                    <span className={`font-bold ${balance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                        {formatCurrency(balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

