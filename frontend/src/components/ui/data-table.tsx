"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    RowSelectionState,
    ColumnSizingState,
    Header,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    onRowSelectionChange?: (rows: TData[]) => void
    columnVisibility?: VisibilityState
    onColumnVisibilityChange?: (visibility: VisibilityState) => void
    columnSizing?: ColumnSizingState
    onColumnSizingChange?: (sizing: ColumnSizingState) => void
    pinnedColumns?: { left?: string[]; right?: string[] }
    isLoading?: boolean
    emptyMessage?: React.ReactNode
    className?: string
    onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowSelectionChange,
    columnVisibility: externalColumnVisibility,
    onColumnVisibilityChange,
    columnSizing: externalColumnSizing,
    onColumnSizingChange,
    pinnedColumns,
    onRowClick,
    isLoading,
    emptyMessage,
    className,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    
    // Use external state if provided, otherwise use internal
    const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({})
    const [internalColumnSizing, setInternalColumnSizing] = React.useState<ColumnSizingState>({})
    
    const columnVisibility = externalColumnVisibility ?? internalColumnVisibility
    const columnSizing = externalColumnSizing ?? internalColumnSizing

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: (updater) => {
            const newVisibility = typeof updater === 'function' 
                ? updater(columnVisibility) 
                : updater
            if (onColumnVisibilityChange) {
                onColumnVisibilityChange(newVisibility)
            } else {
                setInternalColumnVisibility(newVisibility)
            }
        },
        onRowSelectionChange: setRowSelection,
        onColumnSizingChange: (updater) => {
            const newSizing = typeof updater === 'function'
                ? updater(columnSizing)
                : updater
            if (onColumnSizingChange) {
                onColumnSizingChange(newSizing)
            } else {
                setInternalColumnSizing(newSizing)
            }
        },
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            columnSizing,
        },
    })

    // Notify parent of row selection changes
    React.useEffect(() => {
        if (onRowSelectionChange) {
            const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
            onRowSelectionChange(selectedRows)
        }
    }, [rowSelection, onRowSelectionChange, table])

    // Get pinned columns
    const leftPinnedColumnIds = pinnedColumns?.left ?? []
    const rightPinnedColumnIds = pinnedColumns?.right ?? []

    // Calculate sticky positions for pinned columns
    const getColumnStickyStyle = (header: Header<TData, unknown>): React.CSSProperties => {
        const columnId = header.column.id
        
        if (leftPinnedColumnIds.includes(columnId)) {
            let left = 0
            const headers = table.getHeaderGroups()[0]?.headers ?? []
            for (const h of headers) {
                if (h.column.id === columnId) break
                if (leftPinnedColumnIds.includes(h.column.id)) {
                    left += h.getSize()
                }
            }
            return {
                position: 'sticky',
                left,
                zIndex: 10,
                backgroundColor: 'var(--background)',
            }
        }
        
        if (rightPinnedColumnIds.includes(columnId)) {
            let right = 0
            const headers = [...(table.getHeaderGroups()[0]?.headers ?? [])].reverse()
            for (const h of headers) {
                if (h.column.id === columnId) break
                if (rightPinnedColumnIds.includes(h.column.id)) {
                    right += h.getSize()
                }
            }
            return {
                position: 'sticky',
                right,
                zIndex: 10,
                backgroundColor: 'var(--background)',
            }
        }
        
        return {}
    }

    return (
        <div className={cn("rounded-md border overflow-hidden", className)}>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const stickyStyle = getColumnStickyStyle(header)
                                    const canResize = header.column.getCanResize()
                                    
                                    return (
                                        <TableHead
                                            key={header.id}
                                            style={{
                                                width: header.getSize(),
                                                minWidth: header.column.columnDef.minSize,
                                                maxWidth: header.column.columnDef.maxSize,
                                                ...stickyStyle,
                                            }}
                                            className={cn(
                                                "relative select-none",
                                                header.column.getCanSort() && "cursor-pointer"
                                            )}
                                            aria-sort={
                                                header.column.getIsSorted()
                                                    ? header.column.getIsSorted() === 'asc'
                                                        ? 'ascending'
                                                        : 'descending'
                                                    : 'none'
                                            }
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            
                                            {/* Column Resize Handle */}
                                            {canResize && (
                                                <div
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    className={cn(
                                                        "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                                                        "hover:bg-primary/50 active:bg-primary",
                                                        header.column.getIsResizing() && "bg-primary"
                                                    )}
                                                />
                                            )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            // Loading skeleton
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {table.getVisibleFlatColumns().map((column) => (
                                        <TableCell key={column.id}>
                                            <div className="h-4 bg-muted animate-pulse rounded" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => {
                                const rowData = row.original as any
                                
                                return (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={cn(
                                            "transition-colors duration-150",
                                            onRowClick && "cursor-pointer hover:bg-muted/50",
                                            row.getIsSelected() && "bg-primary/5"
                                        )}
                                        onClick={(e) => {
                                            if (!onRowClick) return
                                            
                                            // Não navegar se clicou em checkbox, botão ou link
                                            const target = e.target as HTMLElement
                                            if (
                                                target.closest('input[type="checkbox"]') ||
                                                target.closest('button') ||
                                                target.closest('a') ||
                                                target.closest('[role="button"]') ||
                                                target.closest('label') ||
                                                target.tagName === 'LABEL' ||
                                                target.tagName === 'INPUT'
                                            ) {
                                                e.stopPropagation()
                                                return
                                            }
                                            
                                            // Chamar callback de navegação
                                            onRowClick(rowData)
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const header = table.getHeaderGroups()[0]?.headers.find(
                                                h => h.column.id === cell.column.id
                                            )
                                            const stickyStyle = header ? getColumnStickyStyle(header) : {}
                                            
                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    style={{
                                                        width: cell.column.getSize(),
                                                        minWidth: cell.column.columnDef.minSize,
                                                        maxWidth: cell.column.columnDef.maxSize,
                                                        ...stickyStyle,
                                                    }}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {emptyMessage || "Nenhum resultado encontrado."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

// Re-export types for convenience
export type { ColumnDef, SortingState, VisibilityState, ColumnSizingState }

