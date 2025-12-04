"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
    page: number
    totalPages: number
    totalItems?: number
    itemsPerPage?: number
    onPageChange: (page: number) => void
    onItemsPerPageChange?: (itemsPerPage: number) => void
    showItemsPerPage?: boolean
    showQuickJump?: boolean
    showPageNumbers?: boolean
    className?: string
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function Pagination({
    page,
    totalPages,
    totalItems,
    itemsPerPage = 10,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPage = true,
    showQuickJump = true,
    showPageNumbers = true,
    className,
}: PaginationProps) {
    const [jumpToPage, setJumpToPage] = React.useState("")

    // Calcular range de itens exibidos
    const startItem = totalItems ? (page - 1) * itemsPerPage + 1 : 0
    const endItem = totalItems ? Math.min(page * itemsPerPage, totalItems) : 0

    // Gerar números de página para exibição
    const getPageNumbers = () => {
        const pages: (number | "ellipsis")[] = []
        const maxVisible = 5
        
        if (totalPages <= maxVisible + 2) {
            // Mostrar todas as páginas
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            // Sempre mostrar primeira página
            pages.push(1)
            
            if (page > 3) {
                pages.push("ellipsis")
            }
            
            // Páginas ao redor da atual
            const start = Math.max(2, page - 1)
            const end = Math.min(totalPages - 1, page + 1)
            
            for (let i = start; i <= end; i++) {
                pages.push(i)
            }
            
            if (page < totalPages - 2) {
                pages.push("ellipsis")
            }
            
            // Sempre mostrar última página
            pages.push(totalPages)
        }
        
        return pages
    }

    const handleJumpToPage = (e: React.FormEvent) => {
        e.preventDefault()
        const pageNum = parseInt(jumpToPage)
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum)
            setJumpToPage("")
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            setJumpToPage("")
            ;(e.target as HTMLInputElement).blur()
        }
    }

    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-4", className)}>
            {/* Informações de itens */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {totalItems !== undefined && (
                    <span>
                        Exibindo {startItem}-{endItem} de {totalItems} itens
                    </span>
                )}
                
                {/* Seletor de itens por página */}
                {showItemsPerPage && onItemsPerPageChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Itens por página:</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option.toString()}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Controles de paginação */}
            <div className="flex items-center gap-2">
                {/* Números de página */}
                {showPageNumbers && totalPages > 1 && (
                    <div className="hidden sm:flex items-center gap-1">
                        {getPageNumbers().map((pageNum, index) => (
                            pageNum === "ellipsis" ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-2 text-muted-foreground"
                                >
                                    ...
                                </span>
                            ) : (
                                <Button
                                    key={pageNum}
                                    variant={page === pageNum ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "h-8 w-8 p-0",
                                        page === pageNum && "pointer-events-none"
                                    )}
                                    onClick={() => onPageChange(pageNum)}
                                    aria-label={`Ir para página ${pageNum}`}
                                    aria-current={page === pageNum ? "page" : undefined}
                                >
                                    {pageNum}
                                </Button>
                            )
                        ))}
                    </div>
                )}

                {/* Navegação básica para mobile */}
                <div className="flex items-center gap-1">
                    {/* Primeira página */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(1)}
                        disabled={page <= 1}
                        aria-label="Primeira página"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>

                    {/* Página anterior */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        aria-label="Página anterior"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Anterior</span>
                    </Button>

                    {/* Indicador de página atual (mobile) */}
                    <span className="sm:hidden text-sm text-muted-foreground px-2">
                        {page} / {totalPages}
                    </span>

                    {/* Próxima página */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        aria-label="Próxima página"
                    >
                        <span className="hidden sm:inline mr-1">Próxima</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Última página */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(totalPages)}
                        disabled={page >= totalPages}
                        aria-label="Última página"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Input para ir direto à página */}
                {showQuickJump && totalPages > 5 && (
                    <form onSubmit={handleJumpToPage} className="hidden lg:flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground">Ir para:</span>
                        <Input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={page.toString()}
                            className="h-8 w-16 text-center"
                            aria-label="Ir para página"
                        />
                    </form>
                )}
            </div>
        </div>
    )
}
