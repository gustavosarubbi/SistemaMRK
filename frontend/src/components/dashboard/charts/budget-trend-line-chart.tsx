import {
  AreaChart,
  Area,
  Line,
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
import { TrendData } from "@/types";

interface BudgetTrendLineChartProps {
  data?: TrendData[];
}

export function BudgetTrendLineChart({ data = [] }: BudgetTrendLineChartProps) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Tendência de Execução
        </CardTitle>
        <CardDescription className="text-xs">
          Comparativo Orçado vs. Realizado (últimos 6 meses)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(0)}M`}
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
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "budget" ? "Orçamento" : "Realizado"
                  ]}
                  labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "0.25rem" }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  formatter={(value) => value === "budget" ? "Orçamento" : "Realizado"}
                />
                <Area
                  type="monotone"
                  dataKey="budget"
                  name="budget"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorBudget)"
                />
                <Area
                  type="monotone"
                  dataKey="realized"
                  name="realized"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  fill="url(#colorRealized)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}




