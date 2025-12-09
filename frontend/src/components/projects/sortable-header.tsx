"use client"

import { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SortableHeaderProps<TData, TValue> {
    column: Column<TData, TValue>
    title: string
    className?: string
}

export function SortableHeader<TData, TValue>({
    column,
    title,
    className,
}: SortableHeaderProps<TData, TValue>) {
    if (!column.getCanSort()) {
        return <span className={className}>{title}</span>
    }

    const sorted = column.getIsSorted()

    return (
        <Button
            variant="ghost"
            size="sm"
            className={cn(
                "-ml-3 h-8 data-[state=open]:bg-accent font-semibold",
                "hover:bg-muted/50 transition-colors",
                className
            )}
            onClick={() => column.toggleSorting(sorted === "asc")}
            aria-label={`Ordenar por ${title}`}
        >
            <span>{title}</span>
            <span className="ml-2 flex items-center">
                {sorted === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-primary transition-transform" />
                ) : sorted === "desc" ? (
                    <ArrowDown className="h-3.5 w-3.5 text-primary transition-transform" />
                ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
            </span>
        </Button>
    )
}


