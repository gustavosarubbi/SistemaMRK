import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
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

interface DistributionPieChartProps {
    data: { type: string; value: number; count: number }[];
}

const COLORS = [
    "hsl(var(--primary))",
    "hsl(142, 71%, 45%)",
    "hsl(38, 92%, 50%)",
    "hsl(0, 84%, 60%)",
    "hsl(262, 83%, 58%)",
    "hsl(199, 89%, 48%)",
];

export function DistributionPieChart({ data }: DistributionPieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">
                    Distribuição por Tipo
                </CardTitle>
                <CardDescription className="text-xs">
                    Movimentações agrupadas por tipo
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                    fontSize: "12px"
                                }}
                                formatter={(value: number, name: string, props: any) => [
                                    formatCurrency(value),
                                    `${props.payload.type} (${props.payload.count} movimentações)`
                                ]}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                                formatter={(value, entry: any) => {
                                    const percent = ((entry.payload.value / total) * 100).toFixed(1);
                                    return `${value} (${percent}%)`;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

