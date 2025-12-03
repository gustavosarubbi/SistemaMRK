import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectTimelineProps {
    startDate: string;
    endDate: string;
    className?: string;
}

export function ProjectTimeline({ startDate, endDate, className }: ProjectTimelineProps) {
    if (!startDate || !endDate || startDate.length !== 8 || endDate.length !== 8) return null;

    // Convert dates from YYYYMMDD
    const start = new Date(Number(startDate.substring(0, 4)), Number(startDate.substring(4, 6)) - 1, Number(startDate.substring(6, 8)));
    const end = new Date(Number(endDate.substring(0, 4)), Number(endDate.substring(4, 6)) - 1, Number(endDate.substring(6, 8)));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDuration = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    
    // Calculate percentage
    let percentage = 0;
    if (today < start) {
        percentage = 0;
    } else if (today > end) {
        percentage = 100;
    } else if (totalDuration > 0) {
        percentage = Math.round((elapsed / totalDuration) * 100);
    }

    // Determine color class based on time elapsed
    // Standard progress bar logic:
    // < 70% = Normal (Green/Blue in this context, maybe neutral since it's time)
    // > 90% = Warning (Orange) - "Ending soon"
    // > 100% = Finished (Gray or Red if active but late?)
    
    let colorClass = "bg-primary";
    if (percentage > 100) {
        colorClass = "bg-slate-500"; // Finished
    } else if (percentage > 90) {
        colorClass = "bg-amber-500"; // Ending soon
    }
    
    const formattedStart = start.toLocaleDateString('pt-BR');
    const formattedEnd = end.toLocaleDateString('pt-BR');
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Clamp for visual width
    const visualWidth = Math.min(Math.max(percentage, 0), 100);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("w-full space-y-1.5", className)}>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{formattedStart}</span>
                            <span>{formattedEnd}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div 
                                className={cn("h-full transition-all duration-500 ease-out", colorClass)}
                                style={{ width: `${visualWidth}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-center font-medium">
                            {today > end 
                                ? "Vigência encerrada" 
                                : today < start 
                                    ? "Não iniciado"
                                    : `${percentage}% decorrido`
                            }
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-xs">
                        <p>Início: {formattedStart}</p>
                        <p>Fim: {formattedEnd}</p>
                        <p className="mt-1 font-medium">
                            {today > end 
                                ? `Encerrado há ${Math.abs(daysLeft)} dias`
                                : `Faltam ${daysLeft} dias`
                            }
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

