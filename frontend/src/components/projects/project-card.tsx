"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ProgressBar } from "@/components/ui/progress-bar"
import { ProjectAlerts } from "@/components/dashboard/project-alerts"
import { Project } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { ArrowRight, Calendar, User } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
    project: Project
    isSelected: boolean
    onSelect: (selected: boolean) => void
    style?: React.CSSProperties
    className?: string
}

// Formatar data de YYYYMMDD para DD/MM/YYYY
const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return '-'
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`
}

// Badge de vigência
const getVigenciaBadge = (dtIni: string, dtFim: string) => {
    if (!dtIni || !dtFim || dtIni.length !== 8 || dtFim.length !== 8) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const start = new Date(Number(dtIni.substring(0, 4)), Number(dtIni.substring(4, 6)) - 1, Number(dtIni.substring(6, 8)))
    const end = new Date(Number(dtFim.substring(0, 4)), Number(dtFim.substring(4, 6)) - 1, Number(dtFim.substring(6, 8)))
    
    const endPlus60 = new Date(end)
    endPlus60.setDate(endPlus60.getDate() + 60)
    
    if (today >= start && today <= end) {
        return <Badge variant="success" className="text-[10px]">Em Execução</Badge>
    } else if (today > end && today <= endPlus60) {
        return <Badge variant="warning" className="text-[10px]">Prestar Contas</Badge>
    } else if (today > endPlus60) {
        return <Badge variant="secondary" className="text-[10px]">Finalizado</Badge>
    } else {
        return <Badge variant="outline" className="text-[10px]">Não Iniciado</Badge>
    }
}

export function ProjectCard({
    project,
    isSelected,
    onSelect,
    style,
    className,
}: ProjectCardProps) {
    const usagePercent = project.usage_percent || 0
    const balance = (project.budget || 0) - (project.realized || 0)

    return (
        <Card 
            className={cn(
                "group relative transition-all duration-200",
                "hover:shadow-lg hover:border-primary/30",
                isSelected && "ring-2 ring-primary border-primary",
                className
            )}
            style={style}
        >
            {/* Checkbox de seleção */}
            <div className="absolute top-3 right-3 z-10">
                <Checkbox
                    checked={isSelected}
                    onChange={(e) => onSelect(e.target.checked)}
                    aria-label={`Selecionar ${project.CTT_DESC01}`}
                />
            </div>

            <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                        {project.CTT_CUSTO}
                    </Badge>
                    {getVigenciaBadge(project.CTT_DTINI, project.CTT_DTFIM)}
                </div>
                <div className="flex items-start gap-1.5 mt-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">
                        {project.CTT_DESC01 || 'Sem descrição'}
                    </h3>
                    <ProjectAlerts project={project} />
                </div>
                {project.CTT_UNIDES && (
                    <p className="text-xs text-muted-foreground truncate">
                        {project.CTT_UNIDES}
                    </p>
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Info do coordenador e período */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 truncate">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{project.CTT_NOMECO || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(project.CTT_DTFIM)}</span>
                    </div>
                </div>

                {/* Valores financeiros */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <span className="text-muted-foreground">Orçamento</span>
                        <p className="font-semibold">{formatCurrency(project.budget || 0)}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Realizado</span>
                        <p className="font-semibold">{formatCurrency(project.realized || 0)}</p>
                    </div>
                </div>

                {/* Saldo */}
                <div className="text-xs">
                    <span className="text-muted-foreground">Saldo</span>
                    <p className={cn(
                        "font-semibold",
                        balance < 0 && "text-destructive"
                    )}>
                        {formatCurrency(balance)}
                    </p>
                </div>

                {/* Barra de progresso */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Execução</span>
                        <span className="font-semibold">{usagePercent.toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={usagePercent} />
                </div>

                {/* Botão de detalhes */}
                <Link href={`/dashboard/projects/${project.CTT_CUSTO}`} className="block">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        Ver Detalhes
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    )
}

