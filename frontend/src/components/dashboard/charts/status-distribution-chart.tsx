import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StatusDistributionData } from "@/types";

interface StatusDistributionChartProps {
  data: StatusDistributionData[];
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  // Filter out zero values for better visualization
  const filteredData = data.filter(item => item.value > 0);
  
  // Calculate total for percentage
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Distribuição por Status
        </CardTitle>
        <CardDescription className="text-xs">
          Projetos agrupados por status atual
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => 
                    percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [
                    `${value} projeto${value !== 1 ? 's' : ''} (${((value / total) * 100).toFixed(1)}%)`,
                    "Quantidade"
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  formatter={(value) => {
                    const item = filteredData.find(d => d.name === value);
                    return item ? `${value} (${item.value})` : value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

