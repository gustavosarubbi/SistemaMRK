import {
  LineChart,
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

// Mock data since the current API response doesn't strictly provide time-series
const mockTrendData = [
  { month: "Jan", budget: 4000000, realized: 2400000 },
  { month: "Fev", budget: 3000000, realized: 1398000 },
  { month: "Mar", budget: 2000000, realized: 9800000 },
  { month: "Abr", budget: 2780000, realized: 3908000 },
  { month: "Mai", budget: 1890000, realized: 4800000 },
  { month: "Jun", budget: 2390000, realized: 3800000 },
];

export function BudgetTrendLineChart() {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Tendência de Execução
        </CardTitle>
        <CardDescription className="text-xs">
          Comparativo Orçado vs. Realizado (Simulado)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mockTrendData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
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
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "0.25rem" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Line
                type="monotone"
                dataKey="budget"
                name="Orçamento"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="realized"
                name="Realizado"
                stroke="hsl(217, 91%, 60%)" // blue-600
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}



