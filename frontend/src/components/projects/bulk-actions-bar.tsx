"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { X, GitCompare, Download, FileSpreadsheet, FileText, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { ExportFormat } from "@/lib/export-utils"

interface BulkActionsBarProps {
    count: number
    onCompare: () => void
    onExport: (format: ExportFormat) => void
    onClear: () => void
    className?: string
}

export function BulkActionsBar({
    count,
    onCompare,
    onExport,
    onClear,
    className,
}: BulkActionsBarProps) {
    if (count === 0) return null

    return (
        <div
            className={cn(
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
                "flex items-center gap-3 px-4 py-3 rounded-lg",
                "bg-primary text-primary-foreground shadow-lg",
                "animate-in slide-in-from-bottom-4 fade-in-0 duration-300",
                className
            )}
        >
            <span className="text-sm font-medium">
                {count} projeto{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}
            </span>

            <div className="h-4 w-px bg-primary-foreground/30" />

            {count >= 2 && count <= 4 && (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onCompare}
                    className="h-8 gap-1.5"
                >
                    <GitCompare className="h-3.5 w-3.5" />
                    Comparar
                </Button>
            )}

            {/* Menu de Exportação */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1.5"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Exportar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="w-48 mb-2">
                    <DropdownMenuLabel>Exportar selecionados ({count})</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 font-normal"
                        onClick={() => onExport('csv')}
                    >
                        <File className="h-4 w-4" />
                        CSV (.csv)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 font-normal"
                        onClick={() => onExport('excel')}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel (.xlsx)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 font-normal"
                        onClick={() => onExport('pdf')}
                    >
                        <FileText className="h-4 w-4" />
                        PDF (.pdf)
                    </Button>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}
