"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Project } from "@/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { SortableHeader } from "./sortable-header"
import { ProjectAlerts } from "@/components/dashboard/project-alerts"
import { ProjectTimeline } from "@/components/dashboard/project-timeline"
import { UrgencyIcon } from "./urgency-badge"
import { formatCurrency } from "@/lib/utils"
import { ArrowRight, Clock, Eye, ExternalLink } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getProjectClassification, getServiceType, getProjectAnalyst } from "@/lib/project-mappings"
import { 
    getDaysRemaining, 
    getUrgencyLevel, 
    formatDaysRemaining,
    getDaysRemainingForAccountRendering,
    getDaysSinceEnd,
    isInRenderingAccountsPeriod,
    isInExecution,
    isNotStarted,
} from "@/lib/date-utils"

// Formatar data de YYYYMMDD para DD/MM/YYYY
const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return '-'
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`
}

// Badge de vigência
const getVigenciaBadge = (dtIni: string, dtFim: string, isFinalized?: boolean) => {
    if (!dtIni || !dtFim || dtIni.length !== 8 || dtFim.length !== 8) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const start = new Date(Number(dtIni.substring(0, 4)), Number(dtIni.substring(4, 6)) - 1, Number(dtIni.substring(6, 8)))
    const end = new Date(Number(dtFim.substring(0, 4)), Number(dtFim.substring(4, 6)) - 1, Number(dtFim.substring(6, 8)))
    
    const endPlus60 = new Date(end)
    endPlus60.setDate(endPlus60.getDate() + 60)
    
    if (today >= start && today <= end) {
        return <Badge variant="success" className="text-[10px] h-5 px-1.5 whitespace-nowrap">Em Execução</Badge>
    } else if (today > end && today <= endPlus60) {
        return <Badge variant="warning" className="text-[10px] h-5 px-1.5 whitespace-nowrap">Prestar Contas</Badge>
    } else if (today > endPlus60) {
        // Se foi validado como finalizado, mostra "Finalizado", senão "Pendente"
        return <Badge variant="secondary" className="text-[10px] h-5 px-1.5 whitespace-nowrap">
            {isFinalized ? 'Finalizado' : 'Pendente'}
        </Badge>
    } else {
        return <Badge variant="outline" className="text-[10px] h-5 px-1.5 whitespace-nowrap">Não Iniciado</Badge>
    }
}

// Badge de status financeiro
const getStatusBadge = (usagePercent: number) => {
    if (usagePercent > 100) {
        return <Badge variant="critical">Excedido</Badge>
    } else if (usagePercent > 85) {
        return <Badge variant="danger">Crítico</Badge>
    } else if (usagePercent > 70) {
        return <Badge variant="warning">Atenção</Badge>
    } else {
        return <Badge variant="success">Em dia</Badge>
    }
}

export const projectColumns: ColumnDef<Project>[] = [
    // Checkbox de seleção
    {
        id: "select",
        header: ({ table }) => (
            <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                    onChange={(e) => {
                        e.stopPropagation()
                        table.toggleAllPageRowsSelected(e.target.checked)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Selecionar todos"
                />
            </div>
        ),
        cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={row.getIsSelected()}
                    onChange={(e) => {
                        e.stopPropagation()
                        row.toggleSelected(e.target.checked)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Selecionar linha"
                />
            </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
    },
    // Ações
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const project = row.original
            return (
                <Link 
                    href={`/dashboard/projects/${encodeURIComponent(project.CTT_CUSTO)}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 hover:bg-primary hover:text-primary-foreground transition-colors"
                        title="Ver Detalhes do Projeto"
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </Link>
            )
        },
        enableSorting: false,
        enableHiding: false,
        size: 50,
    },
    // Centro de Custo
    {
        accessorKey: "CTT_CUSTO",
        header: ({ column }) => <SortableHeader column={column} title="Custo" />,
        cell: ({ row }) => (
            <span className="font-semibold text-xs">{row.getValue("CTT_CUSTO")}</span>
        ),
        size: 90,
    },
    // Descrição / Cliente
    {
        accessorKey: "CTT_DESC01",
        header: ({ column }) => <SortableHeader column={column} title="Descrição / Cliente" />,
        cell: ({ row }) => {
            const project = row.original
            return (
                <Link 
                    href={`/dashboard/projects/${encodeURIComponent(project.CTT_CUSTO)}`}
                    className="block hover:opacity-80 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div>
                        <div className="font-medium text-xs truncate max-w-[180px] flex items-center gap-1.5 group" title={project.CTT_DESC01}>
                            <span className="group-hover:text-primary transition-colors">
                                {project.CTT_DESC01 || 'Sem Descrição'}
                            </span>
                            <ProjectAlerts project={project} />
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {project.CTT_UNIDES && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                                {project.CTT_UNIDES}
                            </div>
                        )}
                    </div>
                </Link>
            )
        },
        size: 200,
        minSize: 150,
    },
    // Classificação
    {
        accessorKey: "CTT_CLAPRJ",
        header: ({ column }) => <SortableHeader column={column} title="Classificação" />,
        cell: ({ row }) => {
            const classification = getProjectClassification(row.getValue("CTT_CLAPRJ"));
            const code = row.getValue("CTT_CLAPRJ") as string;
            // Cores diferentes para cada classificação
            const getVariant = (code?: string) => {
                if (!code) return "secondary";
                const variants: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "critical"> = {
                    '1': 'default',      // Governamental - azul
                    '2': 'success',       // Federal - verde
                    '3': 'warning',      // Privado - amarelo
                    '4': 'danger',       // Gestora - laranja
                    '5': 'critical',     // Concursos - vermelho
                    '6': 'secondary',    // Centro de Custo - cinza
                };
                return variants[code] || 'outline';
            };
            return (
                <Badge 
                    variant={getVariant(code)} 
                    className="text-xs px-2 py-1 font-semibold whitespace-nowrap"
                >
                    {classification}
                </Badge>
            );
        },
        size: 100,
    },
    // Tipo Prestação
    {
        accessorKey: "CTT_TPCONV",
        header: ({ column }) => <SortableHeader column={column} title="Tipo Prestação" />,
        cell: ({ row }) => {
            const serviceType = getServiceType(row.getValue("CTT_TPCONV"));
            const code = row.getValue("CTT_TPCONV") as string;
            // Cores diferentes para cada tipo
            const getVariant = (code?: string) => {
                if (!code) return "secondary";
                const variants: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "critical"> = {
                    '1': 'default',      // Convenio - azul
                    '2': 'success',      // Contrato - verde
                    '3': 'warning',      // Termo Cooperacao Tecnica - amarelo
                    '4': 'danger',       // Cursos - laranja
                    '5': 'critical',     // Concursos - vermelho
                    '6': 'secondary',    // Seminario - cinza
                    '7': 'outline',      // P e D - outline
                    '8': 'default',      // Processo Seletivo - azul
                    '9': 'secondary',    // Outros - cinza
                };
                return variants[code] || 'outline';
            };
            return (
                <Badge 
                    variant={getVariant(code)} 
                    className="text-xs px-2 py-1 font-semibold whitespace-nowrap"
                >
                    {serviceType}
                </Badge>
            );
        },
        size: 100,
    },
    // Período
    {
        id: "period",
        header: ({ column }) => <SortableHeader column={column} title="Período" />,
        accessorFn: (row) => row.CTT_DTINI,
        cell: ({ row }) => {
            const project = row.original
            return (
                <div className="text-xs whitespace-nowrap">
                    {formatDate(project.CTT_DTINI)} <br/> 
                    <span className="text-muted-foreground text-[10px]">até</span> {formatDate(project.CTT_DTFIM)}
                    <div className="mt-1">
                        {getVigenciaBadge(project.CTT_DTINI, project.CTT_DTFIM, project.is_finalized)}
                    </div>
                </div>
            )
        },
        size: 120,
    },
    // Cronograma (Timeline)
    {
        id: "timeline",
        header: "Cronograma",
        cell: ({ row }) => {
            const project = row.original
            return <ProjectTimeline startDate={project.CTT_DTINI} endDate={project.CTT_DTFIM} />
        },
        enableSorting: false,
        size: 140,
    },
    // Dias Restantes de Vigência
    {
        id: "vigenciaDaysRemaining",
        header: ({ column }) => <SortableHeader column={column} title="Dias Restantes Vigência" />,
        accessorFn: (row) => {
            const days = getDaysRemaining(row.CTT_DTFIM);
            // Só retorna valor se ainda está em vigência (dias >= 0)
            return days !== null && days >= 0 ? days : null;
        },
        cell: ({ row }) => {
            const project = row.original
            const daysRemaining = getDaysRemaining(project.CTT_DTFIM)
            const urgencyLevel = getUrgencyLevel(project)
            const projectInExecution = isInExecution(project.CTT_DTINI, project.CTT_DTFIM)
            const projectNotStarted = isNotStarted(project.CTT_DTINI)
            
            // Só mostra se está em execução ou não iniciado
            if (projectNotStarted && daysRemaining !== null && daysRemaining > 0) {
                return (
                    <div className="flex items-center gap-2">
                        <UrgencyIcon level={urgencyLevel} size="sm" />
                        <div className="text-xs">
                            <div className="font-medium text-blue-600">
                                {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}
                            </div>
                            <div className="text-[10px] text-muted-foreground">para iniciar</div>
                        </div>
                    </div>
                )
            }
            
            if (projectInExecution && daysRemaining !== null && daysRemaining >= 0) {
                return (
                    <div className="flex items-center gap-2">
                        <UrgencyIcon level={urgencyLevel} size="sm" />
                        <div className="text-xs">
                            <div className={cn(
                                "font-medium",
                                daysRemaining === 0 && "text-orange-600",
                                daysRemaining > 0 && daysRemaining <= 7 && "text-amber-600",
                                daysRemaining > 7 && "text-green-600"
                            )}>
                                {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}
                            </div>
                            <div className="text-[10px] text-muted-foreground">restantes</div>
                        </div>
                    </div>
                )
            }
            
            // Se já passou da vigência, não mostra nada (mostra na coluna de prestação)
            return <span className="text-xs text-muted-foreground">-</span>
        },
        size: 150,
    },
    // Dias Restantes para Prestação de Contas
    {
        id: "renderingDaysRemaining",
        header: ({ column }) => <SortableHeader column={column} title="Dias Restantes PC" />,
        accessorFn: (row) => getDaysRemainingForAccountRendering(row.CTT_DTFIM),
        cell: ({ row }) => {
            const project = row.original
            const daysSinceEnd = getDaysSinceEnd(project.CTT_DTFIM)
            const isRendering = isInRenderingAccountsPeriod(project.CTT_DTFIM)
            const renderingDaysRemaining = getDaysRemainingForAccountRendering(project.CTT_DTFIM)
            
            // Só mostra se está em período de prestação de contas
            if (!isRendering || daysSinceEnd === 0) {
                return <span className="text-xs text-muted-foreground">-</span>
            }
            
            return (
                <div className="text-xs">
                    <div className={cn(
                        "font-medium flex items-center gap-1",
                        renderingDaysRemaining !== null && renderingDaysRemaining <= 15 ? "text-red-600" : 
                        renderingDaysRemaining !== null && renderingDaysRemaining <= 30 ? "text-orange-600" : 
                        "text-amber-600"
                    )}>
                        <Clock className="h-3 w-3" />
                        {renderingDaysRemaining !== null ? (
                            <>
                                {renderingDaysRemaining} dia{renderingDaysRemaining !== 1 ? 's' : ''}
                            </>
                        ) : (
                            'Prazo esgotado'
                        )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                        {daysSinceEnd} de 60 decorridos
                    </div>
                </div>
            )
        },
        size: 150,
    },
    // Coordenador
    {
        accessorKey: "CTT_NOMECO",
        header: ({ column }) => <SortableHeader column={column} title="Coordenador" />,
        cell: ({ row }) => {
            const project = row.original
            return (
                <div>
                    <div className="text-xs font-medium truncate max-w-[140px]" title={project.CTT_NOMECO}>
                        {project.CTT_NOMECO || '-'}
                    </div>
                    {getProjectAnalyst(project) !== '-' && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px] mt-0.5">
                            Analista: {getProjectAnalyst(project)}
                        </div>
                    )}
                </div>
            )
        },
        size: 140,
    },
    // Orçamento
    {
        accessorKey: "budget",
        header: ({ column }) => <SortableHeader column={column} title="Orçamento" />,
        cell: ({ row }) => (
            <div className="font-semibold text-xs whitespace-nowrap text-right">
                {formatCurrency(row.getValue("budget") || 0)}
            </div>
        ),
        size: 120,
    },
    // Realizado
    {
        accessorKey: "realized",
        header: ({ column }) => <SortableHeader column={column} title="Realizado" />,
        cell: ({ row }) => (
            <div className="text-xs whitespace-nowrap text-right">
                {formatCurrency(row.getValue("realized") || 0)}
            </div>
        ),
        size: 120,
    },
    // Execução Financeira
    {
        accessorKey: "usage_percent",
        header: ({ column }) => <SortableHeader column={column} title="Execução Financeira" />,
        cell: ({ row }) => {
            const usagePercent = row.getValue("usage_percent") as number || 0
            return (
                <div className="space-y-1.5 min-w-[140px]">
                    <ProgressBar value={usagePercent} />
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="text-[10px] font-medium whitespace-nowrap">
                            {usagePercent.toFixed(1)}%
                        </div>
                        <div className="flex-shrink-0 scale-90">
                            {getStatusBadge(usagePercent)}
                        </div>
                    </div>
                </div>
            )
        },
        size: 160,
    },
]

// Colunas para modo compacto
export const compactColumns: ColumnDef<Project>[] = [
    projectColumns[0], // select
    projectColumns[1], // CTT_CUSTO
    projectColumns[2], // CTT_DESC01
    projectColumns[10], // budget
    projectColumns[12], // usage_percent
    projectColumns[13], // actions
]

// Mapeamento de IDs para nomes de colunas (para UI de visibilidade)
export const columnLabels: Record<string, string> = {
    select: "Seleção",
    CTT_CUSTO: "Centro de Custo",
    CTT_DESC01: "Descrição / Cliente",
    CTT_CLAPRJ: "Classificação",
    CTT_TPCONV: "Tipo Prestação",
    period: "Período",
    timeline: "Cronograma",
    vigenciaDaysRemaining: "Dias Restantes Vigência",
    renderingDaysRemaining: "Dias Restantes PC",
    CTT_NOMECO: "Coordenador",
    budget: "Orçamento",
    realized: "Realizado",
    usage_percent: "Execução Financeira",
    actions: "Ações",
}

/**
 * Função para obter cor de fundo da linha baseada na urgência
 */
export function getRowUrgencyClass(project: Project): string {
    const urgencyLevel = getUrgencyLevel(project)
    
    switch (urgencyLevel) {
        case 4:
            return 'bg-red-50/50 hover:bg-red-100/50'
        case 3:
            return 'bg-orange-50/50 hover:bg-orange-100/50'
        case 2:
            return 'bg-amber-50/50 hover:bg-amber-100/50'
        default:
            return ''
    }
}

