"use client"

import { KPICard } from "./kpi-card";
import { Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { KPI } from "@/types";

interface PrimaryKPIsProps {
    kpis: KPI;
}

/**
 * Componente de KPIs principais (3-5 KPIs mais importantes).
 * Usado na aba "Visão Geral" para reduzir poluição visual.
 */
export function PrimaryKPIs({ kpis }: PrimaryKPIsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <KPICard
                title="Total Projetos"
                value={kpis.total_projects}
                description="Projetos no período"
                icon={Briefcase}
                iconColor="text-primary"
                iconBgColor="bg-primary/10"
            />
            
            <KPICard
                title="Orçamento Total"
                value={kpis.total_budget}
                description="Previsto"
                icon={DollarSign}
                iconColor="text-emerald-600"
                iconBgColor="bg-emerald-500/10"
            />
            
            <KPICard
                title="Realizado Total"
                value={kpis.total_realized}
                description="Executado"
                icon={TrendingUp}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-500/10"
                valueColor="text-blue-600"
            />
        </div>
    );
}


