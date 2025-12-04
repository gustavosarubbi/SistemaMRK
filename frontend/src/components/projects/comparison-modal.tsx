"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Project } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { Download, X } from "lucide-react"
import { exportToPDF } from "@/lib/export-utils"
import { cn } from "@/lib/utils"

interface ComparisonModalProps {
    isOpen: boolean
    onClose: () => void
    projects: Project[]
}

// Formatar data de YYYYMMDD para DD/MM/YYYY
const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return '-'
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`
}

export function ComparisonModal({
    isOpen,
    onClose,
    projects,
}: ComparisonModalProps) {
    if (projects.length < 2) return null

    const handleExport = () => {
        exportToPDF(projects, `comparacao-projetos-${Date.now()}`)
    }

    // Encontrar valores máximos para escala visual
    const maxBudget = Math.max(...projects.map(p => p.budget || 0))
    const maxRealized = Math.max(...projects.map(p => p.realized || 0))

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClose={onClose}>
                <DialogHeader>
                    <DialogTitle>Comparação de Projetos</DialogTitle>
                    <DialogDescription>
                        Comparando {projects.length} projetos lado a lado
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {/* Grid de comparação */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${projects.length}, 1fr)` }}>
                        {projects.map((project) => (
                            <div 
                                key={project.CTT_CUSTO} 
                                className="border rounded-lg p-4 space-y-4"
                            >
                                {/* Header do projeto */}
                                <div className="space-y-1">
                                    <Badge variant="outline" className="text-xs">
                                        {project.CTT_CUSTO}
                                    </Badge>
                                    <h3 className="font-semibold text-sm line-clamp-2">
                                        {project.CTT_DESC01 || 'Sem descrição'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {project.CTT_UNIDES || '-'}
                                    </p>
                                </div>

                                {/* Período */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Período</p>
                                    <p className="text-sm font-medium">
                                        {formatDate(project.CTT_DTINI)} - {formatDate(project.CTT_DTFIM)}
                                    </p>
                                </div>

                                {/* Coordenador */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Coordenador</p>
                                    <p className="text-sm font-medium truncate">
                                        {project.CTT_NOMECO || '-'}
                                    </p>
                                </div>

                                {/* Orçamento */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Orçamento</p>
                                    <p className="text-sm font-semibold">
                                        {formatCurrency(project.budget || 0)}
                                    </p>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 transition-all"
                                            style={{ width: `${maxBudget > 0 ? ((project.budget || 0) / maxBudget) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Realizado */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Realizado</p>
                                    <p className="text-sm font-semibold">
                                        {formatCurrency(project.realized || 0)}
                                    </p>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-green-500 transition-all"
                                            style={{ width: `${maxRealized > 0 ? ((project.realized || 0) / maxRealized) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Saldo */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Saldo</p>
                                    <p className={cn(
                                        "text-sm font-semibold",
                                        ((project.budget || 0) - (project.realized || 0)) < 0 && "text-destructive"
                                    )}>
                                        {formatCurrency((project.budget || 0) - (project.realized || 0))}
                                    </p>
                                </div>

                                {/* Execução */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Execução</p>
                                        <p className="text-xs font-semibold">
                                            {(project.usage_percent || 0).toFixed(1)}%
                                        </p>
                                    </div>
                                    <ProgressBar value={project.usage_percent || 0} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabela resumida */}
                    <div className="mt-6 pt-4 border-t">
                        <h4 className="font-semibold text-sm mb-3">Resumo Comparativo</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 font-medium">Métrica</th>
                                    {projects.map((p) => (
                                        <th key={p.CTT_CUSTO} className="text-right py-2 font-medium">
                                            {p.CTT_CUSTO}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="py-2">Orçamento</td>
                                    {projects.map((p) => (
                                        <td key={p.CTT_CUSTO} className="text-right py-2">
                                            {formatCurrency(p.budget || 0)}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2">Realizado</td>
                                    {projects.map((p) => (
                                        <td key={p.CTT_CUSTO} className="text-right py-2">
                                            {formatCurrency(p.realized || 0)}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2">Saldo</td>
                                    {projects.map((p) => (
                                        <td key={p.CTT_CUSTO} className={cn(
                                            "text-right py-2",
                                            ((p.budget || 0) - (p.realized || 0)) < 0 && "text-destructive"
                                        )}>
                                            {formatCurrency((p.budget || 0) - (p.realized || 0))}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="py-2">% Execução</td>
                                    {projects.map((p) => (
                                        <td key={p.CTT_CUSTO} className="text-right py-2">
                                            {(p.usage_percent || 0).toFixed(1)}%
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                    <Button onClick={handleExport} className="gap-1.5">
                        <Download className="h-4 w-4" />
                        Exportar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

