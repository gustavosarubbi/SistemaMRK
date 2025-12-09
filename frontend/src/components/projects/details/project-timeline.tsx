import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectTimelineProps {
    startDate: string; // YYYYMMDD format
    endDate: string; // YYYYMMDD format
    className?: string;
}

export function ProjectTimeline({ startDate, endDate, className }: ProjectTimelineProps) {
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

    if (today < start) {
        status = 'not_started';
        statusColor = 'bg-muted';
        statusText = 'Não iniciado';
    } else if (today > end) {
        status = 'finished';
        statusColor = 'bg-muted-foreground';
        statusText = 'Finalizado';
    } else if (remainingDays <= 0) {
        status = 'overdue';
        statusColor = 'bg-red-600';
        statusText = `${Math.abs(remainingDays)} dias de atraso`;
    } else if (remainingDays <= 30) {
        status = 'ending_soon';
        statusColor = 'bg-orange-600';
        statusText = `${remainingDays} dias restantes`;
    } else {
        status = 'in_progress';
        statusColor = 'bg-green-600';
        statusText = `${remainingDays} dias restantes`;
    }

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(startDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(endDate)}</span>
                </div>
            </div>
            
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
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
                "text-xs text-center font-medium",
                status === 'overdue' && "text-red-600",
                status === 'ending_soon' && "text-orange-600",
                status === 'in_progress' && "text-green-600",
                status === 'finished' && "text-muted-foreground",
                status === 'not_started' && "text-muted-foreground"
            )}>
                {statusText}
            </p>
        </div>
    );
}


