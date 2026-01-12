import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectTimelineProps {
    startDate: string; // YYYYMMDD format
    endDate: string; // YYYYMMDD format
    className?: string;
    cttDtenc?: string; // Data de encerramento real do ERP
}

export function ProjectTimeline({ startDate, endDate, className, cttDtenc }: ProjectTimelineProps) {
    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return '-';
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    };

    const parseDate = (dateStr: string): Date | null => {
        if (!dateStr || dateStr.length !== 8) return null;
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!start || !end) {
        return (
            <div className={cn("text-sm text-muted-foreground", className)}>
                Datas inválidas
            </div>
        );
    }

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const progress = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);

    // Determinar status
    let status: 'not_started' | 'in_progress' | 'ending_soon' | 'overdue' | 'finished';
    let statusColor = 'bg-primary';
    let statusText = '';

    // Verificar se tem data de encerramento válida
    const hasEncerramento = cttDtenc && cttDtenc.trim().length === 8;

    // 1. Não Iniciado
    if (today < start) {
        status = 'not_started';
        statusColor = 'bg-muted';
        statusText = 'Não iniciado';
    }
    // 2. Em Execução (Prioridade sobre Encerrado ERP)
    else if (today <= end) {
        if (remainingDays <= 30) {
            status = 'ending_soon';
            statusColor = 'bg-orange-600';
            statusText = `${remainingDays} dias restantes`;
        } else {
            status = 'in_progress';
            statusColor = 'bg-green-600';
            statusText = `${remainingDays} dias restantes`;
        }
    }
    // 3. Encerrado (Somente se não estiver em execução)
    else if (hasEncerramento) {
        status = 'finished';
        statusColor = 'bg-muted-foreground';
        statusText = 'Encerrado';
    }
    // 4. Prestar Contas (Até 60 dias após o fim e sem CTT_DTENC)
    else if (remainingDays <= 0 && Math.abs(remainingDays) <= 60) {
        status = 'overdue'; // Usando 'overdue' visualmente para prestação de contas pendente
        statusColor = 'bg-orange-500';
        statusText = 'Prestar Contas';
    }
    // 5. Pendente (Mais de 60 dias após o fim)
    else {
        status = 'finished';
        statusColor = 'bg-muted-foreground';
        statusText = 'Pendente';
    }

    return (
        <div className={cn("space-y-2.5", className)}>
            <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(startDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(endDate)}</span>
                </div>
            </div>

            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn("absolute h-full rounded-full transition-all duration-500", statusColor)}
                    style={{ width: `${progress}%` }}
                />
                {status === 'in_progress' || status === 'ending_soon' ? (
                    <div
                        className="absolute h-full w-0.5 bg-foreground"
                        style={{ left: `${progress}%` }}
                    />
                ) : null}
            </div>

            <p className={cn(
                "text-sm text-center font-bold",
                status === 'overdue' && "text-red-700",
                status === 'ending_soon' && "text-orange-700",
                status === 'in_progress' && "text-green-700",
                status === 'finished' && "text-slate-500",
                status === 'not_started' && "text-slate-500"
            )}>
                {statusText}
            </p>
        </div>
    );
}




