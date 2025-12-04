import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { getDaysSinceEnd, isInRenderingAccountsPeriod, getDaysRemainingForAccountRendering } from "@/lib/date-utils";
import { Clock } from "lucide-react";

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
    let colorClass = "bg-primary";
    if (percentage > 100) {
        colorClass = "bg-slate-500"; // Finished
    } else if (percentage > 90) {
        colorClass = "bg-amber-500"; // Ending soon
    }
    
    const formattedStart = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedEnd = end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Clamp for visual width
    const visualWidth = Math.min(Math.max(percentage, 0), 100);

    // Prestação de contas
    const daysSinceEnd = getDaysSinceEnd(endDate);
    const isRendering = isInRenderingAccountsPeriod(endDate);
    const renderingDaysRemaining = getDaysRemainingForAccountRendering(endDate);

    // Determinar variante do badge baseado na urgência
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" | "warning" | "critical" = "warning";
    let badgeClassName = "";
    if (renderingDaysRemaining !== null && renderingDaysRemaining <= 15) {
        badgeVariant = "critical";
        badgeClassName = "bg-red-100 text-red-700 border-red-300";
    } else if (renderingDaysRemaining !== null && renderingDaysRemaining <= 30) {
        badgeVariant = "warning";
        badgeClassName = "bg-amber-100 text-amber-700 border-amber-300";
    } else {
        badgeVariant = "warning";
        badgeClassName = "bg-yellow-100 text-yellow-700 border-yellow-300";
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("w-full space-y-1.5", className)}>
                        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Início:</span>
                                <span>{formattedStart}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Fim:</span>
                                <span>{formattedEnd}</span>
                            </div>
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
                        {isRendering && daysSinceEnd > 0 && (
                            <div className="flex justify-center">
                                <Badge 
                                    variant={badgeVariant}
                                    className={cn(
                                        "text-[10px] h-5 px-2 font-medium flex items-center gap-1",
                                        badgeClassName
                                    )}
                                >
                                    <Clock className="h-3 w-3" />
                                    <span>PC: {daysSinceEnd}/60</span>
                                </Badge>
                            </div>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-xs space-y-1">
                        <div>
                            <p className="font-medium">Período de Vigência</p>
                            <p>Início: {formattedStart}</p>
                            <p>Fim: {formattedEnd}</p>
                        </div>
                        <p className="font-medium pt-1 border-t">
                            {today > end 
                                ? `Encerrado há ${Math.abs(daysLeft)} dias`
                                : `Faltam ${daysLeft} dias`
                            }
                        </p>
                        {isRendering && daysSinceEnd > 0 && (
                            <div className="pt-1 border-t">
                                <p className="font-medium">Prestação de Contas</p>
                                <p>
                                    {daysSinceEnd} de 60 dias decorridos
                                    {renderingDaysRemaining !== null && renderingDaysRemaining > 0 && (
                                        <span className="text-muted-foreground"> ({renderingDaysRemaining} restantes)</span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

