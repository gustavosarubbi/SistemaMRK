import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ExecutionPercentData } from "@/types";

interface ExecutionPercentChartProps {
  data: ExecutionPercentData[];
}

// Colors for execution ranges (green to red gradient)
const getRangeColor = (range: string): string => {
  switch (range) {
    case "0-25%":
      return "#10b981"; // green-500
    case "25-50%":
      return "#84cc16"; // lime-500
    case "50-75%":
      return "#eab308"; // yellow-500
    case "75-100%":
      return "#f59e0b"; // amber-500
    case ">100%":
      return "#ef4444"; // red-500
    default:
      return "#6b7280"; // gray-500
  }
};

export function ExecutionPercentChart({ data }: ExecutionPercentChartProps) {
  // Filter out ranges with zero count
  const filteredData = data.filter(item => item.count > 0);

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Execução por Faixa
        </CardTitle>
        <CardDescription className="text-xs">
          Projetos agrupados por percentual de execução financeira
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
              <BarChart
                layout="vertical"
                data={filteredData}
                margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
                barCategoryGap={15}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  opacity={0.2}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="range"
                  type="category"
                  width={80}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ExecutionPercentData;
                      return (
                        <div className="rounded-lg border bg-popover p-2 shadow-md">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.65rem] uppercase text-muted-foreground">
                                Faixa
                              </span>
                              <span className="font-bold text-muted-foreground text-sm">
                                {data.range}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.65rem] uppercase text-muted-foreground">
                                Projetos
                              </span>
                              <span className="font-bold text-foreground text-sm">
                                {data.count}
                              </span>
                            </div>
                            <div className="flex flex-col col-span-2">
                              <span className="text-[0.65rem] uppercase text-muted-foreground">
                                Orçamento Total
                              </span>
                              <span className="font-bold font-mono text-emerald-600 text-sm">
                                {formatCurrency(data.total_budget)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(val: any) => {
                      const num = typeof val === 'number' ? val : Number(val) || 0;
                      return `${num} projeto${num !== 1 ? 's' : ''}`;
                    }}
                    style={{
                      fill: "hsl(var(--foreground))",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getRangeColor(entry.range)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

