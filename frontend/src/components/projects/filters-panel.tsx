"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
    Search, 
    X, 
    Filter, 
    Calendar, 
    User, 
    Building2, 
    RotateCcw, 
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Save,
    Bookmark,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProjectFilters, SavedFilter } from "@/types"

interface FiltersPanelProps {
    filters: ProjectFilters
    onFiltersChange: (filters: Partial<ProjectFilters>) => void
    onClearFilters: () => void
    coordinators: string[]
    clients: string[]
    savedFilters: SavedFilter[]
    onSaveFilter: () => void
    onApplyFilter: (filter: SavedFilter) => void
    onDeleteFilter: (id: string) => void
    isOpen: boolean
    onToggle: () => void
    className?: string
}

export function FiltersPanel({
    filters,
    onFiltersChange,
    onClearFilters,
    coordinators,
    clients,
    savedFilters,
    onSaveFilter,
    onApplyFilter,
    onDeleteFilter,
    isOpen,
    onToggle,
    className,
}: FiltersPanelProps) {
    const [searchValue, setSearchValue] = React.useState(filters.search || "")
    
    // Sincronizar searchValue com filters.search
    React.useEffect(() => {
        setSearchValue(filters.search || "")
    }, [filters.search])

    // Contar filtros ativos
    const activeFiltersCount = [
        filters.search,
        filters.endDate,
        filters.coordinator,
        filters.client,
        filters.status,
        filters.showApprovedOnly,
    ].filter(Boolean).length + (filters.startDate !== '2023-01-01' ? 1 : 0)

    const hasActiveFilters = activeFiltersCount > 0

    // Handler para busca com debounce
    const handleSearchChange = (value: string) => {
        setSearchValue(value)
    }

    // Aplicar busca ao pressionar Enter ou blur
    const handleSearchSubmit = () => {
        onFiltersChange({ search: searchValue })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearchSubmit()
        } else if (e.key === "Escape") {
            setSearchValue("")
            onFiltersChange({ search: "" })
        }
    }

    return (
        <Card className={cn("border-2 transition-all duration-200", className)}>
            <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onToggle}
                        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                    >
                        <div className="p-1.5 rounded-md bg-primary/10">
                            <Filter className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-base font-semibold">
                            Filtros de Busca
                        </CardTitle>
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>
                    
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <>
                                <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1">
                                    {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                                </Badge>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={onClearFilters} 
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    title="Limpar todos os filtros"
                                >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                    Limpar
                                </Button>
                            </>
                        )}
                        
                        {/* Salvar filtro atual */}
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onSaveFilter}
                                className="h-7 px-2 text-xs"
                                title="Salvar filtros atuais"
                            >
                                <Save className="h-3.5 w-3.5 mr-1.5" />
                                Salvar
                            </Button>
                        )}

                        {/* Filtros salvos */}
                        {savedFilters.length > 0 && (
                            <Select
                                onValueChange={(id) => {
                                    const filter = savedFilters.find(f => f.id === id)
                                    if (filter) onApplyFilter(filter)
                                }}
                            >
                                <SelectTrigger className="h-7 w-auto gap-1.5 text-xs">
                                    <Bookmark className="h-3.5 w-3.5" />
                                    <SelectValue placeholder="Filtros salvos" />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedFilters.map((filter) => (
                                        <SelectItem key={filter.id} value={filter.id}>
                                            <div className="flex items-center justify-between gap-4">
                                                <span>{filter.name}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDeleteFilter(filter.id)
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            {/* Conteúdo colapsável */}
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
            >
                <div className="overflow-hidden">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {/* Busca */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                    Buscar
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        placeholder="Projeto, centro de custo..."
                                        value={searchValue}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onBlur={handleSearchSubmit}
                                        onKeyDown={handleKeyDown}
                                        className="pl-9 pr-8 h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors truncate"
                                    />
                                    {searchValue && (
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-muted rounded-md transition-colors"
                                            onClick={() => {
                                                setSearchValue("")
                                                onFiltersChange({ search: "" })
                                            }}
                                            title="Limpar busca"
                                        >
                                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Coordenador */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    Coordenador
                                </label>
                                <div className="relative">
                                    <Select 
                                        value={filters.coordinator || undefined} 
                                        onValueChange={(value) => onFiltersChange({ coordinator: value })}
                                    >
                                        <SelectTrigger className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors pr-9 [&>span]:truncate [&>span]:max-w-full">
                                            <SelectValue placeholder="Todos os coordenadores" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {coordinators.length > 0 ? (
                                                coordinators.map((coord) => (
                                                    <SelectItem key={coord} value={coord}>{coord}</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-data" disabled>Nenhum disponível</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {filters.coordinator && (
                                        <button
                                            type="button"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-muted rounded-md transition-colors z-10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onFiltersChange({ coordinator: "" })
                                            }}
                                            title="Limpar coordenador"
                                        >
                                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Cliente */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Cliente
                                </label>
                                <div className="relative">
                                    <Select 
                                        value={filters.client || undefined} 
                                        onValueChange={(value) => onFiltersChange({ client: value })}
                                    >
                                        <SelectTrigger className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors pr-9 [&>span]:truncate [&>span]:max-w-full">
                                            <SelectValue placeholder="Todos os clientes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.length > 0 ? (
                                                clients.map((client) => (
                                                    <SelectItem key={client} value={client}>{client}</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-data" disabled>Nenhum disponível</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {filters.client && (
                                        <button
                                            type="button"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-muted rounded-md transition-colors z-10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onFiltersChange({ client: "" })
                                            }}
                                            title="Limpar cliente"
                                        >
                                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Data Início */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    Data Início
                                </label>
                                <Input 
                                    type="date" 
                                    value={filters.startDate || ""} 
                                    onChange={(e) => onFiltersChange({ startDate: e.target.value })}
                                    className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors"
                                />
                            </div>

                            {/* Data Fim */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    Data Fim
                                </label>
                                <Input 
                                    type="date" 
                                    value={filters.endDate || ""} 
                                    onChange={(e) => onFiltersChange({ endDate: e.target.value })}
                                    className="h-10 w-full text-sm border-2 focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Toggle Aprovados/Não Aprovados */}
                        <div className="mt-5 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                        <Label htmlFor="approved-toggle" className="text-sm font-medium cursor-pointer">
                                            Apenas projetos aprovados
                                        </Label>
                                    </div>
                                </div>
                                <Switch
                                    id="approved-toggle"
                                    checked={filters.showApprovedOnly || false}
                                    onCheckedChange={(checked) => onFiltersChange({ showApprovedOnly: checked })}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 ml-7">
                                {filters.showApprovedOnly 
                                    ? 'Exibindo apenas projetos com orçamento aprovado e não bloqueados'
                                    : 'Exibindo todos os projetos (aprovados e não aprovados)'}
                            </p>
                        </div>

                        {/* Tags de Filtros Ativos */}
                        {hasActiveFilters && (
                            <div className="mt-5 pt-4 border-t">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">Filtros aplicados:</span>
                                    {filters.search && (
                                        <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                            Busca: "{filters.search}"
                                            <button
                                                onClick={() => onFiltersChange({ search: "" })}
                                                className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                    {filters.coordinator && (
                                        <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                            Coordenador: {filters.coordinator}
                                            <button
                                                onClick={() => onFiltersChange({ coordinator: "" })}
                                                className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                    {filters.client && (
                                        <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                            Cliente: {filters.client}
                                            <button
                                                onClick={() => onFiltersChange({ client: "" })}
                                                className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                    {filters.startDate && filters.startDate !== '2023-01-01' && (
                                        <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                            Início: {new Date(filters.startDate).toLocaleDateString('pt-BR')}
                                            <button
                                                onClick={() => onFiltersChange({ startDate: '2023-01-01' })}
                                                className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                    {filters.endDate && (
                                        <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                            Fim: {new Date(filters.endDate).toLocaleDateString('pt-BR')}
                                            <button
                                                onClick={() => onFiltersChange({ endDate: "" })}
                                                className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                    {filters.status && (
                                        <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                            Status: {
                                                filters.status === 'in_execution' ? 'Em Execução' : 
                                                filters.status === 'rendering_accounts' ? 'Prestar Contas' : 
                                                filters.status === 'finished' ? 'Finalizados' :
                                                filters.status === 'all' ? 'Todos' : 'Ativos'
                                            }
                                            <button
                                                onClick={() => onFiltersChange({ status: "" })}
                                                className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                    {filters.showApprovedOnly && (
                                        <Badge variant="secondary" className="text-xs px-2.5 py-1 font-normal">
                                            Apenas aprovados
                                            <button
                                                onClick={() => onFiltersChange({ showApprovedOnly: false })}
                                                className="ml-1.5 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </div>
            </div>
        </Card>
    )
}







