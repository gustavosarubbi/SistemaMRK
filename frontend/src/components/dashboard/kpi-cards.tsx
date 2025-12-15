import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Briefcase, DollarSign, TrendingUp, Wallet, PlayCircle, AlertTriangle, AlertCircle, CreditCard } from "lucide-react";
import { KPI } from "@/types";
import { ProgressBar } from "@/components/ui/progress-bar";

interface KPICardsProps {
  kpis: KPI;
}

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            Saldo Orçamentário
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
            Orçamento - Realizado
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Financeiro
          </CardTitle>
          <div
            className={`p-1.5 rounded-full ${
              (kpis.financial_balance ?? 0) < 0 ? "bg-red-500/10" : "bg-purple-500/10"
            }`}
          >
            <CreditCard
              className={`h-3.5 w-3.5 ${
                (kpis.financial_balance ?? 0) < 0 ? "text-red-500" : "text-purple-600"
              }`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`text-xl font-bold truncate ${
              (kpis.financial_balance ?? 0) < 0 ? "text-red-500" : "text-purple-600"
            }`}
            title={formatCurrency(kpis.financial_balance ?? 0)}
          >
            {formatCurrency(kpis.financial_balance ?? 0)}
          </div>
          {/* Barra de progresso padronizada: Saldo Financeiro / Realizado */}
          {kpis.total_billing && kpis.total_billing > 0 && kpis.total_realized > 0 && (
            <div className="mt-2">
              {(() => {
                const x = kpis.financial_balance ?? 0; // O que sobrou (pode ser negativo)
                
                // Se saldo negativo (provisões > realizado), calcular % de ultrapassagem
                if (x < 0 && kpis.total_billing && kpis.total_billing > kpis.total_realized) {
                  const exceededPercentage = (kpis.total_billing / kpis.total_realized) * 100;
                  return (
                    <>
                      <ProgressBar value={100} />
                      <p className="text-xs text-right mt-1 text-muted-foreground">
                        {exceededPercentage.toFixed(1)}%
                      </p>
                    </>
                  );
                }
                
                // Se saldo positivo, calcular normalmente
                const percentage = kpis.total_realized > 0 ? (x / kpis.total_realized) * 100 : 0;
                const barValue = Math.min(Math.abs(percentage), 100);
                return (
                  <>
                    <ProgressBar value={barValue} />
                    <p className="text-xs text-right mt-1 text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </p>
                  </>
                );
              })()}
            </div>
          )}
          {(!kpis.total_billing || kpis.total_billing === 0) && (
            <p className="text-xs text-muted-foreground mt-1">
              Sem faturamento
            </p>
          )}
        </CardContent>
      </Card>

      {/* New KPIs - Only show if they exist */}
      {kpis.in_execution !== undefined && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Execução
            </CardTitle>
            <div className="p-1.5 bg-green-500/10 rounded-full">
              <PlayCircle className="h-3.5 w-3.5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.in_execution}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Projetos ativos
            </p>
          </CardContent>
        </Card>
      )}

      {kpis.ending_soon !== undefined && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finalizando
            </CardTitle>
            <div className="p-1.5 bg-amber-500/10 rounded-full">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{kpis.ending_soon}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




