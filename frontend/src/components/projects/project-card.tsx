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
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

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
const getVigenciaBadge = (dtIni: string, dtFim: string, cttDtenc?: string) => {
    if (!dtIni || !dtFim || dtIni.length !== 8 || dtFim.length !== 8) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const start = new Date(Number(dtIni.substring(0, 4)), Number(dtIni.substring(4, 6)) - 1, Number(dtIni.substring(6, 8)))
    const end = new Date(Number(dtFim.substring(0, 4)), Number(dtFim.substring(4, 6)) - 1, Number(dtFim.substring(6, 8)))

    // Verificar se tem data de encerramento válida
    const hasEncerramento = cttDtenc && cttDtenc.trim().length === 8

    const endPlus60 = new Date(end)
    endPlus60.setDate(endPlus60.getDate() + 60)

    // 1. Não Iniciado
    if (today < start) {
        return <Badge variant="outline" className="text-[10px]">Não Iniciado</Badge>
    }

    // 2. Em Execução (Prioridade sobre Encerrado ERP)
    if (today <= end) {
        return <Badge variant="success" className="text-[10px]">Em Execução</Badge>
    }

    // 3. Encerrado (Somente se não estiver em execução)
    if (hasEncerramento) {
        return <Badge variant="secondary" className="text-[10px]">Encerrado</Badge>
    }

    // 4. Prestar Contas (Até 60 dias após o fim e sem CTT_DTENC)
    if (today <= endPlus60) {
        return <Badge variant="warning" className="text-[10px]">Prestar Contas</Badge>
    }

    // 5. Pendente (Mais de 60 dias após o fim e sem CTT_DTENC)
    return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
}

interface BillingResponse {
    total_billing: number;
    billed: number;
    pending: number;
    total_provisions: number;
    count: number;
    billing_records: any[];
}

export function ProjectCard({
    project,
    isSelected,
    onSelect,
    style,
    className,
}: ProjectCardProps) {
    const router = useRouter()
    const usagePercent = project.usage_percent || 0
    const balance = (project.budget || 0) - (project.realized || 0) // Orçamento - Realizado

    // Buscar dados de billing para calcular Saldo Financeiro
    const { data: billingData } = useQuery<BillingResponse>({
        queryKey: ['project_billing', project.CTT_CUSTO],
        queryFn: async () => {
            const res = await api.get(`/projects/${project.CTT_CUSTO}/billing`);
            return res.data;
        },
        staleTime: 60000, // 1 minuto
        gcTime: 300000, // 5 minutos
        refetchOnWindowFocus: false,
    });

    // Calcular Saldo Financeiro: Parcelas Faturadas - Realizado
    const totalBilling = billingData?.total_billing || 0;
    const realized = project.realized || 0;
    const financialBalance = totalBilling > 0
        ? totalBilling - realized
        : 0;

    const handleCardClick = (e: React.MouseEvent) => {
        // Não navegar se o clique foi no checkbox ou no botão de detalhes
        const target = e.target as HTMLElement
        if (
            target.closest('input[type="checkbox"]') ||
            target.closest('button') ||
            target.closest('a')
        ) {
            return
        }
        router.push(`/dashboard/projects/${encodeURIComponent(project.CTT_CUSTO)}`)
    }

    return (
        <Card
            className={cn(
                "group relative transition-all duration-200 cursor-pointer",
                "hover:shadow-lg hover:border-primary/30",
                isSelected && "ring-2 ring-primary border-primary",
                className
            )}
            style={style}
            onClick={handleCardClick}
        >
            {/* Checkbox de seleção */}
            <div
                className="absolute top-3 right-3 z-10"
                onClick={(e) => e.stopPropagation()}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                        if (onSelect) onSelect(!!checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Select project"
                />
            </div>

            <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                        {project.CTT_CUSTO}
                    </Badge>
                    {getVigenciaBadge(project.CTT_DTINI, project.CTT_DTFIM, project.CTT_DTENC)}
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

                {/* Saldos */}
                <div className="space-y-2 text-xs">
                    {/* Saldo Orçamentário */}
                    <div>
                        <span className="text-muted-foreground">Saldo Orçamentário</span>
                        <p className={cn(
                            "font-semibold",
                            balance < 0 && "text-destructive"
                        )}>
                            {formatCurrency(balance)}
                        </p>
                    </div>
                    {/* Saldo Financeiro */}
                    <div>
                        <span className="text-muted-foreground">Saldo Financeiro</span>
                        <p className={cn(
                            "font-semibold",
                            financialBalance < 0 && "text-destructive"
                        )}>
                            {formatCurrency(financialBalance)}
                        </p>
                    </div>
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
                <Link href={`/dashboard/projects/${encodeURIComponent(project.CTT_CUSTO)}`} className="block">
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




