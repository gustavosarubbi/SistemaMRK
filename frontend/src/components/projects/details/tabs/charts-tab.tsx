'use client';

import { useMemo } from 'react';
import { FinancialEvolutionChart } from '../charts/financial-evolution-chart';
import { MonthlyComparisonChart } from '../charts/monthly-comparison-chart';
import { DistributionPieChart } from '../charts/distribution-pie-chart';
import { BudgetGaugeChart } from '../charts/budget-gauge-chart';

interface ChartsTabProps {
    movements: any[];
    budget: number;
    realized: number;
    formatDate: (dateStr: string) => string;
}

export function ChartsTab({ movements, budget, realized, formatDate }: ChartsTabProps) {
    // Processar dados para gráficos
    const chartData = useMemo(() => {
        // Evolução financeira (acumulado mensal)
        const monthlyData: Record<string, number> = {};
        movements.forEach((mov: any) => {
            if (mov.PAC_DATA && mov.PAC_DATA.length === 8) {
                const month = mov.PAC_DATA.substring(0, 6); // YYYYMM
                const monthKey = `${month.substring(4, 6)}/${month.substring(0, 4)}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (mov.PAC_VALOR || 0);
            }
        });

        // Acumular valores
        let accumulated = 0;
        const evolutionData = Object.entries(monthlyData)
            .sort((a, b) => {
                const [monthA, yearA] = a[0].split('/');
                const [monthB, yearB] = b[0].split('/');
                return `${yearA}${monthA}`.localeCompare(`${yearB}${monthB}`);
            })
            .map(([month, value]) => {
                accumulated += value;
                return { month, value: accumulated };
            });

        // Comparativo mensal (orçado vs realizado)
        const comparisonData = Object.entries(monthlyData)
            .sort((a, b) => {
                const [monthA, yearA] = a[0].split('/');
                const [monthB, yearB] = b[0].split('/');
                return `${yearA}${monthA}`.localeCompare(`${yearB}${monthB}`);
            })
            .map(([month, value]) => ({
                month,
                budget: budget / 12, // Distribuição igual (pode ser melhorado com dados reais)
                realized: value,
            }));

        // Distribuição por tipo
        const typeData: Record<string, { value: number; count: number }> = {};
        movements.forEach((mov: any) => {
            const type = mov.PAC_TIPO || 'Sem tipo';
            if (!typeData[type]) {
                typeData[type] = { value: 0, count: 0 };
            }
            typeData[type].value += mov.PAC_VALOR || 0;
            typeData[type].count += 1;
        });

        const distributionData = Object.entries(typeData)
            .map(([type, data]) => ({
                type,
                value: data.value,
                count: data.count,
            }))
            .sort((a, b) => b.value - a.value);

        return {
            evolution: evolutionData,
            comparison: comparisonData,
            distribution: distributionData,
        };
    }, [movements, budget]);

    const usagePercent = budget > 0 ? (realized / budget) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <FinancialEvolutionChart
                    data={chartData.evolution}
                    budget={budget}
                />
                <MonthlyComparisonChart data={chartData.comparison} />
            </div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <DistributionPieChart data={chartData.distribution} />
                <BudgetGaugeChart
                    value={usagePercent}
                    budget={budget}
                    realized={realized}
                />
            </div>
        </div>
    );
}

