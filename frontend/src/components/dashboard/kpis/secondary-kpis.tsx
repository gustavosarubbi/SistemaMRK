"use client"

import { KPICard } from "./kpi-card";
import { Wallet, CreditCard, PlayCircle, AlertTriangle } from "lucide-react";
import { KPI } from "@/types";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SecondaryKPIsProps {
    kpis: KPI;
}

/**
 * Componente de KPIs secundários (expandível).
 * Mostra KPIs adicionais que podem ser expandidos quando necessário.
 */
export function SecondaryKPIs({ kpis }: SecondaryKPIsProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className="space-y-4">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full justify-between"
            >
                <span className="text-sm text-muted-foreground">
                    {isExpanded ? 'Ocultar' : 'Mostrar'} KPIs Adicionais
                </span>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </Button>
            
            {isExpanded && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <KPICard
                        title="Saldo Orçamentário"
                        value={kpis.balance}
                        description="Orçamento - Realizado"
                        icon={Wallet}
                        iconColor={kpis.balance < 0 ? "text-red-500" : "text-emerald-600"}
                        iconBgColor={kpis.balance < 0 ? "bg-red-500/10" : "bg-emerald-500/10"}
                        valueColor={kpis.balance < 0 ? "text-red-500" : "text-emerald-600"}
                    />
                    
                    {kpis.financial_balance !== undefined && (
                        <KPICard
                            title="Saldo Financeiro"
                            value={kpis.financial_balance}
                            icon={CreditCard}
                            iconColor={(kpis.financial_balance ?? 0) < 0 ? "text-red-500" : "text-purple-600"}
                            iconBgColor={(kpis.financial_balance ?? 0) < 0 ? "bg-red-500/10" : "bg-purple-500/10"}
                            valueColor={(kpis.financial_balance ?? 0) < 0 ? "text-red-500" : "text-purple-600"}
                            subtitle={
                                kpis.total_billing && kpis.total_billing > 0 && kpis.total_realized > 0
                                    ? (() => {
                                        const x = kpis.financial_balance ?? 0;
                                        if (x < 0 && kpis.total_billing && kpis.total_billing > kpis.total_realized) {
                                            const exceededPercentage = (kpis.total_billing / kpis.total_realized) * 100;
                                            return `${exceededPercentage.toFixed(1)}%`;
                                        }
                                        const percentage = kpis.total_realized > 0 ? (x / kpis.total_realized) * 100 : 0;
                                        return `${percentage.toFixed(1)}%`;
                                    })()
                                    : "Sem faturamento"
                            }
                        />
                    )}
                    
                    {kpis.in_execution !== undefined && (
                        <KPICard
                            title="Em Execução"
                            value={kpis.in_execution}
                            description="Projetos ativos"
                            icon={PlayCircle}
                            iconColor="text-green-600"
                            iconBgColor="bg-green-500/10"
                            valueColor="text-green-600"
                        />
                    )}
                    
                    {kpis.ending_soon !== undefined && (
                        <KPICard
                            title="Finalizando"
                            value={kpis.ending_soon}
                            description="Próximos 30 dias"
                            icon={AlertTriangle}
                            iconColor="text-amber-600"
                            iconBgColor="bg-amber-500/10"
                            valueColor="text-amber-600"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

