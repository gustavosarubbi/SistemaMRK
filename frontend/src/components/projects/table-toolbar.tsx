"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
    LayoutGrid,
    Table as TableIcon,
    List,
    Columns,
    Download,
    FileSpreadsheet,
    FileText,
    File,
    GitCompare,
    X,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ViewMode } from "@/types"
import { columnLabels } from "./columns"

interface TableToolbarProps {
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    selectedCount: number
    totalCount: number
    visibleColumns: string[]
    onColumnVisibilityChange: (columnId: string, visible: boolean) => void
    onExport: (format: 'csv' | 'excel' | 'pdf', selectedOnly: boolean) => void
    exportAll: boolean
    onExportAllChange: (exportAll: boolean) => void
    onCompare: () => void
    onClearFilters?: () => void
    hasActiveFilters?: boolean
    className?: string
}

const viewModeOptions: { value: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'table', label: 'Tabela', icon: TableIcon },
    { value: 'cards', label: 'Cards', icon: LayoutGrid },
    { value: 'compact', label: 'Compacto', icon: List },
]

// Colunas que podem ser ocultadas
const toggleableColumns = [
    'CTT_CUSTO',
    'CTT_DESC01',
    'CTT_CLAPRJ',
    'CTT_TPCONV',
    'period',
    'timeline',
    'vigenciaDaysRemaining',
    'renderingDaysRemaining',
    'CTT_NOMECO',
    'budget',
    'realized',
    'usage_percent',
]

export function TableToolbar({
    viewMode,
    onViewModeChange,
    selectedCount,
    totalCount,
    visibleColumns,
    onColumnVisibilityChange,
    onExport,
    exportAll,
    onExportAllChange,
    onCompare,
    onClearFilters,
    hasActiveFilters,
    className,
}: TableToolbarProps) {
    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-4 py-2", className)}>
            {/* Lado esquerdo - Contadores e ações de seleção */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                    {selectedCount > 0 ? (
                        <span className="font-medium text-foreground">
                            {selectedCount} de {totalCount} selecionado{selectedCount > 1 ? 's' : ''}
                        </span>
                    ) : (
                        <span>{totalCount} projeto{totalCount !== 1 ? 's' : ''}</span>
                    )}
                </span>

                {/* Botão de comparar (aparece quando há seleção) */}
                {selectedCount >= 2 && selectedCount <= 4 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCompare}
                        className="h-8 gap-1.5"
                    >
                        <GitCompare className="h-3.5 w-3.5" />
                        Comparar ({selectedCount})
                    </Button>
                )}
            </div>

            {/* Lado direito - Controles */}
            <div className="flex items-center gap-2">
                {/* Botão Limpar Filtros */}
                {hasActiveFilters && onClearFilters && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                        className="h-8 gap-1.5"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Limpar Filtros</span>
                    </Button>
                )}

                {/* Seletor de colunas */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                            <Columns className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Colunas</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {toggleableColumns.map((columnId) => (
                            <DropdownMenuCheckboxItem
                                key={columnId}
                                checked={visibleColumns.includes(columnId)}
                                onCheckedChange={(checked) => onColumnVisibilityChange(columnId, checked)}
                            >
                                {columnLabels[columnId] || columnId}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Menu de exportação */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Exportar</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            {selectedCount > 0
                                ? `Exportar ${selectedCount} selecionado${selectedCount > 1 ? 's' : ''}`
                                : exportAll ? 'Exportar todos os resultados' : 'Exportar página atual'
                            }
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <div className="px-2 py-1.5 flex items-center gap-2">
                            <Checkbox
                                id="export-all"
                                checked={exportAll}
                                onCheckedChange={(checked) => onExportAllChange(checked === true)}
                                disabled={selectedCount > 0}
                            />
                            <label
                                htmlFor="export-all"
                                className={cn(
                                    "text-xs font-medium cursor-pointer",
                                    selectedCount > 0 && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                Exportar todos os resultados
                            </label>
                        </div>

                        <DropdownMenuSeparator />

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 font-normal"
                            onClick={() => onExport('csv', selectedCount > 0)}
                        >
                            <File className="h-4 w-4" />
                            CSV (.csv)
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 font-normal"
                            onClick={() => onExport('excel', selectedCount > 0)}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel (.xlsx)
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 font-normal"
                            onClick={() => onExport('pdf', selectedCount > 0)}
                        >
                            <FileText className="h-4 w-4" />
                            PDF (.pdf)
                        </Button>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Toggle de modo de visualização */}
                <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
                    {viewModeOptions.map((option) => {
                        const Icon = option.icon
                        return (
                            <Button
                                key={option.value}
                                variant={viewMode === option.value ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-7 w-7 p-0",
                                    viewMode === option.value && "shadow-sm"
                                )}
                                onClick={() => onViewModeChange(option.value)}
                                title={option.label}
                            >
                                <Icon className="h-3.5 w-3.5" />
                            </Button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

