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
    UserCircle,
    CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedProjectFilters, FilterCounts, DaysRemainingRange, ExecutionRange, Project } from '@/types';
import { getDaysRemainingForAccountRendering } from '@/lib/date-utils';
import { DatePicker } from '@/components/date-picker';

interface FiltersSidebarProps {
    filters: AdvancedProjectFilters;
    onFiltersChange: (filters: Partial<AdvancedProjectFilters>) => void;
    onClearFilters: () => void;
    onSaveFilter: () => void;
    counts: FilterCounts;
    coordinators: string[];
    clients: string[];
    analysts: string[];
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
                    onCheckedChange={onChange}
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
    analysts,
    isOpen,
    onToggle,
    className,
    projects = [],
}: FiltersSidebarProps) {
    // Estado local para sliders
    const [vigenciaDaysRange, setVigenciaDaysRange] = React.useState<[number, number]>([0, 90]);
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
                <FilterSection title="Status do Projeto" icon={CheckCircle2} defaultOpen={true}>
                    <FilterOption
                        label="Todos"
                        value=""
                        count={counts.byStatus.inExecution + counts.byStatus.renderingAccounts + counts.byStatus.notStarted + counts.byStatus.closed}
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
                        label="Prestação de Contas"
                        value="rendering_accounts"
                        count={counts.byStatus.renderingAccounts}
                        checked={filters.status === 'rendering_accounts'}
                        onChange={(v) => onFiltersChange({ status: v })}
                    />
                    <FilterOption
                        label="Não Iniciados"
                        value="not_started"
                        count={counts.byStatus.notStarted}
                        checked={filters.status === 'not_started'}
                        onChange={(v) => onFiltersChange({ status: v })}
                    />
                    <FilterOption
                        label="Encerrados"
                        value="closed"
                        count={counts.byStatus.closed}
                        checked={filters.status === 'closed'}
                        onChange={(v) => onFiltersChange({ status: v })}
                    />
                </FilterSection>

                {/* Período - Sempre aberto */}
                <FilterSection title="Período" icon={Calendar} defaultOpen={true}>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Data Início</Label>
                            <DatePicker
                                date={filters.startDate ? new Date(filters.startDate + 'T00:00:00') : undefined}
                                setDate={(date) => {
                                    onFiltersChange({
                                        startDate: date ? date.toISOString().split('T')[0] : ''
                                    });
                                }}
                                placeholder="Selecione a data inicial"
                                className="w-full"
                                showClearButton={true}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Data Fim</Label>
                            <DatePicker
                                date={filters.endDate ? new Date(filters.endDate + 'T00:00:00') : undefined}
                                setDate={(date) => {
                                    onFiltersChange({
                                        endDate: date ? date.toISOString().split('T')[0] : ''
                                    });
                                }}
                                placeholder="Selecione a data final"
                                className="w-full"
                                showClearButton={true}
                            />
                        </div>
                    </div>
                </FilterSection>

                {/* Urgência e Prazos - Fechado por padrão */}
                <FilterSection title="Urgência e Prazos" icon={Clock} defaultOpen={false}>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Prazo de Vigência</Label>
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
                                <div className="mt-3">
                                    <RangeSlider
                                        min={0}
                                        max={180}
                                        value={vigenciaDaysRange}
                                        onChange={(value) => {
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
                                </div>
                            )}
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                            <div className="flex justify-between">
                                <span>Vence Hoje:</span>
                                <span className="font-medium text-orange-600">{counts.byDaysRemaining.today}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Próximos 7 Dias:</span>
                                <span className="font-medium text-amber-600">{counts.byDaysRemaining.week}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Próximos 30 Dias:</span>
                                <span className="font-medium text-blue-600">{counts.byDaysRemaining.month}</span>
                            </div>
                        </div>
                    </div>
                </FilterSection>

                {/* Execução Financeira - Fechado por padrão */}
                <FilterSection title="Execução Financeira" icon={TrendingUp} defaultOpen={false}>
                    <div className="space-y-2">
                        <FilterCheckbox
                            label="0-50% (Em Dia)"
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

                    <div className="pt-3 border-t mt-3">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                            Range Personalizado:
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

                {/* Pessoas - Fechado por padrão */}
                <FilterSection title="Pessoas" icon={User} defaultOpen={false}>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Coordenador</Label>
                            <Select
                                value={filters.coordinator || 'all'}
                                onValueChange={(value) => onFiltersChange({ coordinator: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Todos os coordenadores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {coordinators
                                        .filter((coord) => {
                                            const normalizedCoord = coord?.trim() || '';
                                            return normalizedCoord && (counts.byCoordinator[normalizedCoord] || 0) > 0;
                                        })
                                        .map((coord) => {
                                            const normalizedCoord = coord?.trim() || '';
                                            return (
                                                <SelectItem key={normalizedCoord} value={normalizedCoord}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="truncate">{normalizedCoord}</span>
                                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                                            {counts.byCoordinator[normalizedCoord] || 0}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Analista</Label>
                            <Select
                                value={filters.analyst || 'all'}
                                onValueChange={(value) => onFiltersChange({ analyst: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Todos os analistas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {analysts
                                        .filter((analyst) => {
                                            const normalizedAnalyst = analyst?.trim() || '';
                                            const isOnlyNumbers = /^\d+$/.test(normalizedAnalyst);
                                            return normalizedAnalyst && !isOnlyNumbers;
                                        })
                                        .filter((analyst) => {
                                            const normalizedAnalyst = analyst?.trim() || '';
                                            return (counts.byAnalyst[normalizedAnalyst] || 0) > 0;
                                        })
                                        .map((analyst) => {
                                            const normalizedAnalyst = analyst?.trim() || '';
                                            return (
                                                <SelectItem key={normalizedAnalyst} value={normalizedAnalyst}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="truncate">{normalizedAnalyst}</span>
                                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                                            {counts.byAnalyst[normalizedAnalyst] || 0}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </FilterSection>

                {/* Organização - Fechado por padrão */}
                <FilterSection title="Organização" icon={Building2} defaultOpen={false}>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Cliente</Label>
                            <Select
                                value={filters.client || 'all'}
                                onValueChange={(value) => onFiltersChange({ client: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Todos os clientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {clients
                                        .filter((client) => {
                                            const normalizedClient = client?.trim() || '';
                                            return normalizedClient && (counts.byClient[normalizedClient] || 0) > 0;
                                        })
                                        .map((client) => {
                                            const normalizedClient = client?.trim() || '';
                                            return (
                                                <SelectItem key={normalizedClient} value={normalizedClient}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="truncate">{normalizedClient}</span>
                                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                                            {counts.byClient[normalizedClient] || 0}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Classificação</Label>
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
                                        .filter(([, count]) => count > 0)
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
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Tipo de Prestação</Label>
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
                                        .filter(([, count]) => count > 0)
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

