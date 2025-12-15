'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Calendar } from "lucide-react";

interface MonthlyExpensesChartProps {
    data: { month: string; value: number }[];
    total?: number;
    onMonthClick?: (month: string) => void;
}

export function MonthlyExpensesChart({ data, total, onMonthClick }: MonthlyExpensesChartProps) {
    // Prepare data for chart - sort by month and get last 12 months
    const sortedData = data
        .map((item) => ({
            month: item.month,
            value: item.value,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    
    // Get only the last 12 months
    const chartData = sortedData.slice(-12);
    const showingAllMonths = sortedData.length <= 12;

    // Calculate max value for better visualization
    const maxValue = Math.max(...chartData.map((d) => d.value), 0);

    // Format month label for display
    const formatMonthLabel = (month: string) => {
        try {
            const [year, monthNum] = month.split('-');
            const monthNames = [
                'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
            ];
            return `${monthNames[parseInt(monthNum) - 1]}/${year.slice(-2)}`;
        } catch {
            return month;
        }
    };

    // Always show the chart, even if empty (will show empty state)
    if (chartData.length === 0) {
        return (
            <Card className="shadow-sm border-border/50 bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold">
                            Evolução dos Gastos Mensais
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px] flex items-center justify-center">
                        <div className="text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                Nenhum gasto registrado no período
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-semibold">
                                Evolução dos Gastos Mensais
                            </CardTitle>
                            {!showingAllMonths && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                    Últimos 12 meses
                                </span>
                            )}
                        </div>
                    </div>
                    {total !== undefined && total > 0 && (
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total no Período</div>
                            <div className="text-lg font-bold text-blue-600">
                                {formatCurrency(total)}
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            onClick={(data) => {
                                if (data && data.activePayload && data.activePayload[0]) {
                                    const month = data.activePayload[0].payload.month;
                                    onMonthClick?.(month);
                                }
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                opacity={0.1}
                                stroke="hsl(var(--border))"
                            />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={formatMonthLabel}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => {
                                    if (value >= 1000000) {
                                        return `R$ ${(value / 1000000).toFixed(1)}M`;
                                    }
                                    if (value >= 1000) {
                                        return `R$ ${(value / 1000).toFixed(0)}k`;
                                    }
                                    return `R$ ${value.toFixed(0)}`;
                                }}
                                width={50}
                            />
                            <Tooltip
                                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3 shadow-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {formatMonthLabel(data.month)}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                        Gasto:
                                                    </span>
                                                    <span className="text-base font-bold text-blue-600">
                                                        {formatCurrency(data.value)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="hsl(217, 91%, 60%)"
                                radius={[4, 4, 0, 0]}
                                style={{ cursor: onMonthClick ? 'pointer' : 'default' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Summary Stats */}
                <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Média Mensal</div>
                            <div className="text-sm font-semibold text-foreground">
                                {formatCurrency(
                                    chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Maior Gasto</div>
                            <div className="text-sm font-semibold text-red-600">
                                {formatCurrency(Math.max(...chartData.map((d) => d.value)))}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Menor Gasto</div>
                            <div className="text-sm font-semibold text-green-600">
                                {formatCurrency(Math.min(...chartData.map((d) => d.value)))}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

