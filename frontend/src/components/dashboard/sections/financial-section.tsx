"use client"

import { useDashboardKPIs } from "@/hooks/use-dashboard-data";
import { KPICard } from "../kpis/kpi-card";
import { Wallet, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Seção Financeira do Dashboard.
 * Mostra KPIs financeiros.
 */
interface FinancialSectionProps {
    enabled?: boolean;
}

export function FinancialSection({ enabled = true }: FinancialSectionProps) {
    const { data: kpisData, isLoading: kpisLoading } = useDashboardKPIs(enabled);
    
    if (kpisLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-4 w-24 mb-4" />
                            <Skeleton className="h-8 w-32" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }
    
    if (!kpisData) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* KPIs Financeiros */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Orçamento Total"
                    value={kpisData.total_budget}
                    description="Previsto"
                    icon={DollarSign}
                    iconColor="text-emerald-600"
                    iconBgColor="bg-emerald-500/10"
                />
                
                <KPICard
                    title="Realizado Total"
                    value={kpisData.total_realized}
                    description="Executado"
                    icon={TrendingUp}
                    iconColor="text-blue-600"
                    iconBgColor="bg-blue-500/10"
                    valueColor="text-blue-600"
                />
                
                <KPICard
                    title="Saldo Orçamentário"
                    value={kpisData.balance}
                    description="Orçamento - Realizado"
                    icon={Wallet}
                    iconColor={kpisData.balance < 0 ? "text-red-500" : "text-emerald-600"}
                    iconBgColor={kpisData.balance < 0 ? "bg-red-500/10" : "bg-emerald-500/10"}
                    valueColor={kpisData.balance < 0 ? "text-red-500" : "text-emerald-600"}
                />
                
                {kpisData.financial_balance !== undefined && (
                    <KPICard
                        title="Saldo Financeiro"
                        value={kpisData.financial_balance}
                        description="Realizado - Faturamento"
                        icon={CreditCard}
                        iconColor={(kpisData.financial_balance ?? 0) < 0 ? "text-red-500" : "text-purple-600"}
                        iconBgColor={(kpisData.financial_balance ?? 0) < 0 ? "bg-red-500/10" : "bg-purple-500/10"}
                        valueColor={(kpisData.financial_balance ?? 0) < 0 ? "text-red-500" : "text-purple-600"}
                    />
                )}
            </div>
        </div>
    );
}

