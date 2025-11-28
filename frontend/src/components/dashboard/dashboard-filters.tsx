import { DashboardDatePicker } from "@/components/dashboard/dashboard-date-picker";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface DashboardFiltersProps {
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  clearFilters: () => void;
}

export function DashboardFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  clearFilters,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-card p-1.5 rounded-lg border shadow-sm relative z-10">
      <div className="flex items-center gap-2 px-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Período:
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <DashboardDatePicker
          date={startDate}
          setDate={setStartDate}
          label="Data Inicial"
          className="w-[130px] h-8 text-xs"
        />
        <span className="text-muted-foreground text-xs">-</span>
        <DashboardDatePicker
          date={endDate}
          setDate={setEndDate}
          label="Data Final"
          className="w-[130px] h-8 text-xs"
        />
      </div>

      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFilters}
          className="h-8 w-8 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
          title="Limpar Filtros"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

