"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Project } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { 
    TrendingUp, 
    TrendingDown, 
    Minus,
    ArrowRight,
    Calendar,
    DollarSign,
    PieChart,
    AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface QuickStatsPopoverProps {
    project: Project
    children: React.ReactNode
}

// Formatar data de YYYYMMDD para DD/MM/YYYY
const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return '-'
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`
}

// Calcular dias restantes
const getDaysRemaining = (dtFim: string): number | null => {
    if (!dtFim || dtFim.length !== 8) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const end = new Date(
        Number(dtFim.substring(0, 4)), 
        Number(dtFim.substring(4, 6)) - 1, 
        Number(dtFim.substring(6, 8))
    )
    
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function QuickStatsPopover({ project, children }: QuickStatsPopoverProps) {
    const budget = project.budget || 0
    const realized = project.realized || 0
    const balance = budget - realized
    const usagePercent = project.usage_percent || 0
    const daysRemaining = getDaysRemaining(project.CTT_DTFIM)

    // Determinar tendência baseada no uso
    const getTrend = () => {
        if (usagePercent > 100) {
            return { icon: TrendingUp, color: "text-destructive", label: "Acima do orçamento" }
        } else if (usagePercent > 85) {
            return { icon: TrendingUp, color: "text-amber-500", label: "Próximo do limite" }
        } else if (usagePercent < 30 && daysRemaining !== null && daysRemaining < 30) {
            return { icon: TrendingDown, color: "text-amber-500", label: "Baixa execução" }
        } else {
            return { icon: Minus, color: "text-muted-foreground", label: "Dentro do esperado" }
        }
    }

    const trend = getTrend()
    const TrendIcon = trend.icon

    return (
        <Popover>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                {/* Header */}
                <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <Badge variant="outline" className="text-xs mb-1">
                                {project.CTT_CUSTO}
                            </Badge>
                            <h4 className="font-semibold text-sm line-clamp-1">
                                {project.CTT_DESC01 || 'Sem descrição'}
                            </h4>
                        </div>
                        <div className={cn("flex items-center gap-1 text-xs", trend.color)}>
                            <TrendIcon className="h-3.5 w-3.5" />
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-4 space-y-4">
                    {/* Métricas principais */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <DollarSign className="h-3 w-3" />
                                Orçamento
                            </div>
                            <p className="font-semibold text-sm">
                                {formatCurrency(budget)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <PieChart className="h-3 w-3" />
                                Realizado
                            </div>
                            <p className="font-semibold text-sm">
                                {formatCurrency(realized)}
                            </p>
                        </div>
                    </div>

                    {/* Saldo */}
                    <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Saldo disponível</span>
                            <span className={cn(
                                "font-bold text-sm",
                                balance < 0 ? "text-destructive" : "text-green-600"
                            )}>
                                {formatCurrency(balance)}
                            </span>
                        </div>
                    </div>

                    {/* Progresso */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Execução financeira</span>
                            <span className="font-semibold">{usagePercent.toFixed(1)}%</span>
                        </div>
                        <ProgressBar value={usagePercent} />
                    </div>

                    {/* Prazo */}
                    {daysRemaining !== null && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">
                                    {daysRemaining > 0 ? 'Dias restantes' : 'Encerrado há'}
                                </p>
                                <p className={cn(
                                    "font-semibold text-sm",
                                    daysRemaining < 0 && "text-amber-600",
                                    daysRemaining <= 30 && daysRemaining > 0 && "text-amber-600"
                                )}>
                                    {Math.abs(daysRemaining)} dia{Math.abs(daysRemaining) !== 1 ? 's' : ''}
                                </p>
                            </div>
                            {daysRemaining <= 30 && daysRemaining > 0 && (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                        </div>
                    )}

                    {/* Alertas rápidos */}
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <TrendIcon className={cn("h-3.5 w-3.5", trend.color)} />
                        {trend.label}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t bg-muted/30">
                    <Link href={`/dashboard/projects/${project.CTT_CUSTO}`}>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                            Ver detalhes completos
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}

