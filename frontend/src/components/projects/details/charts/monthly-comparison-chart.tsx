import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface MonthlyComparisonChartProps {
    data: { month: string; budget: number; realized: number }[];
}

export function MonthlyComparisonChart({ data }: MonthlyComparisonChartProps) {
    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">
                    Comparativo Mensal
                </CardTitle>
                <CardDescription className="text-xs">
                    Orçado vs. Realizado por mês
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
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
                                formatter={(value: number) => [formatCurrency(value), ""]}
                                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "0.25rem" }}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                            <Bar
                                dataKey="budget"
                                name="Orçado"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="realized"
                                name="Realizado"
                                fill="hsl(142, 71%, 45%)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}







