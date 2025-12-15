'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
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
import { PieChart as PieChartIcon } from "lucide-react";

interface ExpensesByItemChartProps {
    data: { name: string; value: number }[];
    total?: number;
    periodLabel?: string;
}

export function ExpensesByItemChart({ data, total, periodLabel }: ExpensesByItemChartProps) {
    // Sort data by value descending and limit to top 10
    const sortedData = [...data]
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // Calculate max value for color gradient
    const maxValue = Math.max(...sortedData.map((d) => d.value), 0);

    // Color gradient based on value
    const getColor = (value: number, max: number, index: number) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        const colors = [
            "hsl(217, 91%, 60%)", // Blue-600
            "hsl(199, 89%, 48%)", // Cyan-600
            "hsl(221, 83%, 53%)", // Blue-500
            "hsl(199, 89%, 55%)", // Cyan-500
            "hsl(217, 91%, 65%)", // Blue-400
            "hsl(199, 89%, 60%)", // Cyan-400
            "hsl(217, 91%, 70%)", // Blue-300
            "hsl(199, 89%, 65%)", // Cyan-300
            "hsl(217, 91%, 75%)", // Blue-200
            "hsl(199, 89%, 70%)", // Cyan-200
        ];
        return colors[index % colors.length];
    };

    if (sortedData.length === 0) {
        return (
            <Card className="shadow-sm border-border/50 bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                            <PieChartIcon className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">
                                Gastos por Item
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {periodLabel || "Nenhum período selecionado"}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px] w-full flex items-center justify-center">
                        <div className="text-center">
                            <PieChartIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                Nenhum gasto registrado no período selecionado
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
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                            <PieChartIcon className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">
                                Gastos por Item
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {periodLabel || "Período selecionado"} - Top 10 itens
                            </CardDescription>
                        </div>
                    </div>
                    {total !== undefined && total > 0 && (
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total no Período</div>
                            <div className="text-lg font-bold text-cyan-600">
                                {formatCurrency(total)}
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedData}
                            layout="vertical"
                            margin={{ top: 10, right: 10, left: 120, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                opacity={0.1}
                                stroke="hsl(var(--border))"
                            />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                width={120}
                            />
                            <Tooltip
                                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3 shadow-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <PieChartIcon className="h-3.5 w-3.5 text-cyan-600" />
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {data.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                        Gasto:
                                                    </span>
                                                    <span className="text-base font-bold text-cyan-600">
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
                                radius={[0, 8, 8, 0]}
                                barSize={32}
                            >
                                {sortedData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getColor(entry.value, maxValue, index)}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

