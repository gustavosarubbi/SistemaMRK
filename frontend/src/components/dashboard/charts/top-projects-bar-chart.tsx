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

interface ProjectData {
  name: string;
  value: number;
}

interface TopProjectsBarChartProps {
  data: ProjectData[];
}

export function TopProjectsBarChart({ data }: TopProjectsBarChartProps) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Top Projetos por Orçamento
        </CardTitle>
        <CardDescription className="text-xs">
          Ranking dos 5 maiores orçamentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
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
                dataKey="name"
                type="category"
                width={150}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) =>
                  value.length > 20 ? `${value.substring(0, 20)}...` : value
                }
                interval={0}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-popover p-2 shadow-md">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.65rem] uppercase text-muted-foreground">
                              Projeto
                            </span>
                            <span className="font-bold text-muted-foreground text-sm">
                              {payload[0].payload.name}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.65rem] uppercase text-muted-foreground">
                              Orçamento
                            </span>
                            <span className="font-bold font-mono text-emerald-600 text-sm">
                              {formatCurrency(payload[0].value as number)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(val: any) => `R$ ${(Number(val) / 1000000).toFixed(1)}M`}
                  style={{
                    fill: "hsl(var(--foreground))",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                />
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(160, 60%, ${45 + index * 5}%)`}
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

