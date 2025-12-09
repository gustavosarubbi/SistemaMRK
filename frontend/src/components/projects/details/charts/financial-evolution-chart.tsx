import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface FinancialEvolutionChartProps {
    data: { month: string; value: number }[];
    budget?: number;
}

export function FinancialEvolutionChart({ data, budget }: FinancialEvolutionChartProps) {
    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">
                    Evolução Financeira
                </CardTitle>
                <CardDescription className="text-xs">
                    Despesas acumuladas ao longo do tempo
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 30,
                                left: 0,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                    fontSize: "12px"
                                }}
                                formatter={(value: number) => [formatCurrency(value), "Valor"]}
                                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "0.25rem" }}
                            />
                            {budget && (
                                <ReferenceLine
                                    y={budget}
                                    stroke="hsl(var(--destructive))"
                                    strokeDasharray="5 5"
                                    label={{ value: "Orçamento", position: "right" }}
                                />
                            )}
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                fill="hsl(var(--primary))"
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}


