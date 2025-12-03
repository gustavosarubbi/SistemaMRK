import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Briefcase, DollarSign, TrendingUp, Wallet } from "lucide-react";

interface KPIData {
  total_projects: number;
  total_budget: number;
  total_realized: number;
  balance: number;
}

interface KPICardsProps {
  kpis: KPIData;
}

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Projetos
          </CardTitle>
          <div className="p-1.5 bg-primary/10 rounded-full">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.total_projects}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Projetos no período
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Orçamento Total
          </CardTitle>
          <div className="p-1.5 bg-emerald-500/10 rounded-full">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-foreground truncate" title={formatCurrency(kpis.total_budget)}>
            {formatCurrency(kpis.total_budget)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Previsto
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Realizado Total
          </CardTitle>
          <div className="p-1.5 bg-blue-500/10 rounded-full">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-blue-600 truncate" title={formatCurrency(kpis.total_realized)}>
            {formatCurrency(kpis.total_realized)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Executado
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Disponível
          </CardTitle>
          <div
            className={`p-1.5 rounded-full ${
              kpis.balance < 0 ? "bg-red-500/10" : "bg-emerald-500/10"
            }`}
          >
            <Wallet
              className={`h-3.5 w-3.5 ${
                kpis.balance < 0 ? "text-red-500" : "text-emerald-600"
              }`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`text-xl font-bold truncate ${
              kpis.balance < 0 ? "text-red-500" : "text-emerald-600"
            }`}
            title={formatCurrency(kpis.balance)}
          >
            {formatCurrency(kpis.balance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Disponível
          </p>
        </CardContent>
      </Card>
    </div>
  );
}



