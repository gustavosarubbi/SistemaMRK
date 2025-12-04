"use client"

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeSlider } from '@/components/ui/range-slider';
import { 
    X, 
    Filter, 
    RotateCcw, 
    Save, 
    Calendar,
    User,
    Building2,
    Clock,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Tag,
    FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedProjectFilters, FilterCounts, DaysRemainingRange, ExecutionRange, Project } from '@/types';
import { getDaysRemainingForAccountRendering } from '@/lib/date-utils';

interface FiltersSidebarProps {
    filters: AdvancedProjectFilters;
    onFiltersChange: (filters: Partial<AdvancedProjectFilters>) => void;
    onClearFilters: () => void;
    onSaveFilter: () => void;
    counts: FilterCounts;
    coordinators: string[];
    clients: string[];
    isOpen: boolean;
    onToggle: () => void;
    className?: string;
    projects?: Project[]; // Para calcular contadores de PC
}

// Seção colapsável
function FilterSection({ 
    title, 
    icon: Icon, 
    children,
    defaultOpen = true 
}: { 
    title: string; 
    icon: React.ComponentType<{ className?: string }>; 
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    
    return (
        <div className="border-b pb-4">
            <button
                className="flex items-center justify-between w-full py-2 text-sm font-medium"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {title}
                </span>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {isOpen && <div className="mt-3 space-y-3">{children}</div>}
        </div>
    );
}

// Opção de radio com contador
function FilterOption({
    label,
    value,
    count,
    checked,
    onChange,
}: {
    label: string;
    value: string;
    count?: number;
    checked: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
                <input
                    type="radio"
                    checked={checked}
                    onChange={() => onChange(value)}
                    className="h-4 w-4 text-primary"
                />
                <span className={cn(
                    "text-sm",
                    checked ? "font-medium" : "text-muted-foreground group-hover:text-foreground"
                )}>
                    {label}
                </span>
            </div>
            {count !== undefined && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {count}
                </Badge>
            )}
        </label>
    );
}

// Opção de checkbox com contador
function FilterCheckbox({
    label,
    count,
    checked,
    onChange,
    color,
}: {
    label: string;
    count?: number;
    checked: boolean;
    onChange: (checked: boolean) => void;
    color?: string;
}) {
    return (
        <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
                <Checkbox
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className={cn(
                    "text-sm",
                    checked ? "font-medium" : "text-muted-foreground group-hover:text-foreground",
                    color
                )}>
                    {label}
                </span>
            </div>
            {count !== undefined && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {count}
                </Badge>
            )}
        </label>
    );
}

const daysRangeOptions: { value: DaysRemainingRange; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'today', label: 'Vence hoje' },
    { value: 'week', label: 'Próximos 7 dias' },
    { value: '15days', label: 'Próximos 15 dias' },
    { value: '30days', label: 'Próximos 30 dias' },
    { value: '60days', label: 'Próximos 60 dias' },
    { value: '90days', label: 'Próximos 90 dias' },
    { value: 'custom', label: 'Personalizado' },
];

export function FiltersSidebar({
    filters,
    onFiltersChange,
    onClearFilters,
    onSaveFilter,
    counts,
    coordinators,
    clients,
    isOpen,
    onToggle,
    className,
    projects = [],
}: FiltersSidebarProps) {
    // Estado local para sliders
    const [vigenciaDaysRange, setVigenciaDaysRange] = React.useState<[number, number]>([0, 90]);
    const [renderingDaysRange, setRenderingDaysRange] = React.useState<[number, number]>([0, 60]);
    const [executionRange, setExecutionRange] = React.useState<[number, number]>([0, 150]);

    // Contar filtros ativos
    const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
        if (key === 'startDate' && value === '2023-01-01') return false;
        if (value === 'all' || value === undefined || value === '') return false;
        return true;
    }).length;

    return (
        <div className={cn(
            "flex flex-col h-full bg-card border-r",
            isOpen ? "w-72" : "w-0 overflow-hidden",
            "transition-all duration-300",
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Filtros</span>
                    {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {activeFiltersCount}
                        </Badge>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Vigência */}
                <FilterSection title="Vigência" icon={Clock}>
                    <FilterOption
                        label="Todos"
                        value=""
                        count={counts.byStatus.inExecution + counts.byStatus.renderingAccounts + counts.byStatus.finished + counts.byStatus.notStarted}
                        checked={!filters.status}
                        onChange={() => onFiltersChange({ status: '' })}
                    />
                    <FilterOption
                        label="Em Execução"
                        value="in_execution"
                        count={counts.byStatus.inExecution}
                        checked={filters.status === 'in_execution'}
                        onChange={(v) => onFiltersChange({ status: v })}
                    />
                    <FilterOption
                        label="Prestar Contas"
                        value="rendering_accounts"
                        count={counts.byStatus.renderingAccounts}
                        checked={filters.status === 'rendering_accounts'}
                        onChange={(v) => onFiltersChange({ status: v })}
                    />
                    <FilterOption
                        label="Finalizados"
                        value="finished"
                        count={counts.byStatus.finished}
                        checked={filters.status === 'finished'}
                        onChange={(v) => onFiltersChange({ status: v })}
                    />
                    <FilterOption
                        label="Não Iniciados"
                        value="not_started"
                        count={counts.byStatus.notStarted}
                        checked={filters.status === 'not_started'}
                        onChange={(v) => onFiltersChange({ status: v })}
                    />
                </FilterSection>

                {/* Dias Restantes de Vigência */}
                <FilterSection title="Dias Restantes Vigência" icon={Calendar}>
                    <Select
                        value={filters.vigenciaDaysRange || 'all'}
                        onValueChange={(value: DaysRemainingRange) => onFiltersChange({ vigenciaDaysRange: value })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            {daysRangeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {filters.vigenciaDaysRange === 'custom' && (
                        <RangeSlider
                            min={0}
                            max={180}
                            value={vigenciaDaysRange}
                            onChange={(value) => {
                                // Garante que não há valores negativos
                                const safeValue: [number, number] = [
                                    Math.max(0, value[0]),
                                    Math.max(0, value[1])
                                ];
                                setVigenciaDaysRange(safeValue);
                                onFiltersChange({
                                    vigenciaDaysMin: safeValue[0],
                                    vigenciaDaysMax: safeValue[1],
                                });
                            }}
                            formatValue={(v) => `${v}d`}
                            showInputs
                        />
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                            <span>Vence hoje:</span>
                            <span className="font-medium text-orange-600">{counts.byDaysRemaining.today}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Próx. 7 dias:</span>
                            <span className="font-medium text-amber-600">{counts.byDaysRemaining.week}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Próx. 30 dias:</span>
                            <span className="font-medium text-blue-600">{counts.byDaysRemaining.month}</span>
                        </div>
                    </div>
                </FilterSection>

                {/* Dias Restantes para Prestação de Contas */}
                <FilterSection title="Dias Restantes PC" icon={Clock}>
                    <Select
                        value={filters.renderingDaysRange || 'all'}
                        onValueChange={(value: DaysRemainingRange) => onFiltersChange({ renderingDaysRange: value })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            {daysRangeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {filters.renderingDaysRange === 'custom' && (
                        <RangeSlider
                            min={0}
                            max={60}
                            value={renderingDaysRange}
                            onChange={(value) => {
                                // Garante que não há valores negativos e limita a 60 dias
                                const safeValue: [number, number] = [
                                    Math.max(0, Math.min(60, value[0])),
                                    Math.max(0, Math.min(60, value[1]))
                                ];
                                setRenderingDaysRange(safeValue);
                                onFiltersChange({
                                    renderingDaysMin: safeValue[0],
                                    renderingDaysMax: safeValue[1],
                                });
                            }}
                            formatValue={(v) => `${v}d`}
                            showInputs
                        />
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                            <span>PC Urgente (≤15d):</span>
                            <span className="font-medium text-red-600">
                                {projects.filter(p => {
                                    const days = getDaysRemainingForAccountRendering(p.CTT_DTFIM);
                                    return days !== null && days <= 15;
                                }).length}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>PC Atenção (≤30d):</span>
                            <span className="font-medium text-orange-600">
                                {projects.filter(p => {
                                    const days = getDaysRemainingForAccountRendering(p.CTT_DTFIM);
                                    return days !== null && days > 15 && days <= 30;
                                }).length}
                            </span>
                        </div>
                    </div>
                </FilterSection>

                {/* Execução Financeira */}
                <FilterSection title="Execução Financeira" icon={TrendingUp}>
                    <div className="space-y-2">
                        <FilterCheckbox
                            label="0-50% (Em dia)"
                            count={counts.byExecution.low}
                            checked={filters.executionRange === 'low'}
                            onChange={() => onFiltersChange({ 
                                executionRange: filters.executionRange === 'low' ? 'all' : 'low' 
                            })}
                            color="text-green-600"
                        />
                        <FilterCheckbox
                            label="50-85% (Atenção)"
                            count={counts.byExecution.medium}
                            checked={filters.executionRange === 'medium'}
                            onChange={() => onFiltersChange({ 
                                executionRange: filters.executionRange === 'medium' ? 'all' : 'medium' 
                            })}
                            color="text-yellow-600"
                        />
                        <FilterCheckbox
                            label="85-100% (Crítico)"
                            count={counts.byExecution.high}
                            checked={filters.executionRange === 'high'}
                            onChange={() => onFiltersChange({ 
                                executionRange: filters.executionRange === 'high' ? 'all' : 'high' 
                            })}
                            color="text-orange-600"
                        />
                        <FilterCheckbox
                            label=">100% (Excedido)"
                            count={counts.byExecution.exceeded}
                            checked={filters.executionRange === 'exceeded'}
                            onChange={() => onFiltersChange({ 
                                executionRange: filters.executionRange === 'exceeded' ? 'all' : 'exceeded' 
                            })}
                            color="text-red-600"
                        />
                    </div>

                    <div className="pt-2">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                            Ou selecione um range:
                        </Label>
                        <RangeSlider
                            min={0}
                            max={150}
                            value={executionRange}
                            onChange={(value) => {
                                setExecutionRange(value);
                                onFiltersChange({
                                    executionRange: 'custom',
                                    executionMin: value[0],
                                    executionMax: value[1],
                                });
                            }}
                            formatValue={(v) => `${v}%`}
                            showInputs
                            colorStops={[
                                { value: 0, color: '#22c55e' },
                                { value: 50, color: '#eab308' },
                                { value: 85, color: '#f97316' },
                                { value: 100, color: '#ef4444' },
                            ]}
                        />
                    </div>
                </FilterSection>

                {/* Coordenador */}
                <FilterSection title="Coordenador" icon={User} defaultOpen={false}>
                    <Select
                        value={filters.coordinator || 'all'}
                        onValueChange={(value) => onFiltersChange({ coordinator: value === 'all' ? '' : value })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Todos os coordenadores" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {coordinators.map((coord) => (
                                <SelectItem key={coord} value={coord}>
                                    <div className="flex items-center justify-between w-full">
                                        <span className="truncate">{coord}</span>
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                            {counts.byCoordinator[coord] || 0}
                                        </Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterSection>

                {/* Cliente */}
                <FilterSection title="Cliente" icon={Building2} defaultOpen={false}>
                    <Select
                        value={filters.client || 'all'}
                        onValueChange={(value) => onFiltersChange({ client: value === 'all' ? '' : value })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Todos os clientes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {clients.map((client) => (
                                <SelectItem key={client} value={client}>
                                    <div className="flex items-center justify-between w-full">
                                        <span className="truncate">{client}</span>
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                            {counts.byClient[client] || 0}
                                        </Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterSection>

                {/* Classificação */}
                <FilterSection title="Classificação" icon={Tag} defaultOpen={false}>
                    <Select
                        value={filters.classification || 'all'}
                        onValueChange={(value) => onFiltersChange({ classification: value === 'all' ? '' : value })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Todas as classificações" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {Object.entries(counts.byClassification)
                                .sort(([, a], [, b]) => b - a)
                                .map(([classification, count]) => (
                                <SelectItem key={classification} value={classification}>
                                    <div className="flex items-center justify-between w-full">
                                        <span className="truncate">{classification}</span>
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                            {count}
                                        </Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterSection>

                {/* Tipo de Prestação */}
                <FilterSection title="Tipo de Prestação" icon={FileText} defaultOpen={false}>
                    <Select
                        value={filters.serviceType || 'all'}
                        onValueChange={(value) => onFiltersChange({ serviceType: value === 'all' ? '' : value })}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Todos os tipos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {Object.entries(counts.byServiceType)
                                .sort(([, a], [, b]) => b - a)
                                .map(([serviceType, count]) => (
                                <SelectItem key={serviceType} value={serviceType}>
                                    <div className="flex items-center justify-between w-full">
                                        <span className="truncate">{serviceType}</span>
                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                            {count}
                                        </Badge>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FilterSection>

                {/* Período */}
                <FilterSection title="Período" icon={Calendar} defaultOpen={false}>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-muted-foreground">Data início</Label>
                            <Input
                                type="date"
                                value={filters.startDate || ''}
                                onChange={(e) => onFiltersChange({ startDate: e.target.value })}
                                className="h-9 mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Data fim</Label>
                            <Input
                                type="date"
                                value={filters.endDate || ''}
                                onChange={(e) => onFiltersChange({ endDate: e.target.value })}
                                className="h-9 mt-1"
                            />
                        </div>
                    </div>
                </FilterSection>
            </div>

            {/* Footer com ações */}
            <div className="p-4 border-t space-y-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onClearFilters}
                    disabled={activeFiltersCount === 0}
                >
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    Limpar Filtros
                </Button>
                <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={onSaveFilter}
                    disabled={activeFiltersCount === 0}
                >
                    <Save className="h-3.5 w-3.5 mr-2" />
                    Salvar Filtro
                </Button>
            </div>
        </div>
    );
}

