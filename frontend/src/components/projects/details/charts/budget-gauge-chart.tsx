import {
    RadialBarChart,
    RadialBar,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BudgetGaugeChartProps {
    value: number; // Percentual de execução (0-100+)
    budget: number;
    realized: number;
}

export function BudgetGaugeChart({ value, budget, realized }: BudgetGaugeChartProps) {
    // Clamp value para exibição (máximo 120% para não quebrar o gauge)
    const displayValue = Math.min(value, 120);
    const data = [
        {
            name: "Execução",
            value: displayValue,
            fill: getColorForValue(value),
        },
    ];

    function getColorForValue(val: number): string {
        if (val > 100) return "hsl(0, 84%, 60%)"; // vermelho - excedido
        if (val > 85) return "hsl(38, 92%, 50%)"; // laranja - crítico
        if (val > 70) return "hsl(48, 96%, 53%)"; // amarelo - atenção
        return "hsl(142, 71%, 45%)"; // verde - normal
    }

    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">
                    Execução Orçamentária
                </CardTitle>
                <CardDescription className="text-xs">
                    Percentual do orçamento utilizado
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="80%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="90%"
                            barSize={20}
                            data={data}
                            startAngle={180}
                            endAngle={0}
                        >
                        <RadialBar
                          label={{ position: "insideStart", fill: "#fff", fontSize: 12 }}
                          background
                          dataKey="value"
                        >
                                <Cell fill={data[0].fill} />
                            </RadialBar>
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-center space-y-1">
                        <div className={cn(
                            "text-3xl font-bold",
                            value > 100 && "text-red-600",
                            value > 85 && value <= 100 && "text-orange-600",
                            value > 70 && value <= 85 && "text-yellow-600",
                            value <= 70 && "text-green-600"
                        )}>
                            {value.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {value > 100 ? "Excedido" : value > 85 ? "Crítico" : value > 70 ? "Atenção" : "Normal"}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

