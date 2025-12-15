'use client';

import React, { useMemo, useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { PieChart, ChevronDown, ChevronRight, Search, ArrowUpDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExportHierarchicalButton } from "../export-hierarchical-button";

interface HierarchicalItem {
    id: string;
    name: string;
    value: number;
    count: number;
    isMother: boolean;
    motherId?: string;
    level: number;
    dates?: string[];
    category?: string;
    emissao?: string; // E2_EMISSAO - data de emissão
    baixa?: string; // E2_BAIXA - data de baixa
}

interface ExpensesByItemHierarchicalChartProps {
    data: HierarchicalItem[];
    total?: number;
    totalTransactions?: number;
    availableMonths?: string[];
    dataBySubrub?: Record<string, string[]>;
    categoryBySubrub?: Record<string, string>;
    projectName?: string;
    projectCode?: string;
}

export function ExpensesByItemHierarchicalChart({ 
    data, 
    total, 
    totalTransactions,
    availableMonths = [],
    dataBySubrub = {},
    categoryBySubrub = {},
    projectName = '',
    projectCode = ''
}: ExpensesByItemHierarchicalChartProps) {
    const [expandedMothers, setExpandedMothers] = useState<Set<string>>(new Set()); // Mães de nível 0 expandidas
    const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set()); // Mães de nível 1 expandidas
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [childrenPerPage, setChildrenPerPage] = useState(10); // Paginação para filhos de nível 1
    const [grandchildrenPerPage, setGrandchildrenPerPage] = useState(10); // Paginação para netos (nível 2)
    const [childrenPages, setChildrenPages] = useState<Record<string, number>>({}); // Página atual para filhos de cada mãe
    const [grandchildrenPages, setGrandchildrenPages] = useState<Record<string, number>>({}); // Página atual para netos de cada filho
    const [sortBy, setSortBy] = useState<'value' | 'count' | 'name'>('value');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(availableMonths));
    
    // Calcular periodLabel interno baseado no selectedMonths do próprio componente
    const periodLabel = useMemo(() => {
        if (selectedMonths.size === 0) return 'Todos os períodos';
        if (selectedMonths.size === 1) {
            const month = Array.from(selectedMonths)[0];
            try {
                const monthDate = parse(month, 'yyyy-MM', new Date());
                const monthName = format(monthDate, 'MMMM', { locale: ptBR });
                const year = format(monthDate, 'yyyy', { locale: ptBR });
                return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} - ${year}`;
            } catch {
                return month;
            }
        }
        if (selectedMonths.size === availableMonths.length) {
            return 'Todo o período';
        }
        const monthsArray = Array.from(selectedMonths).sort();
        try {
            const firstMonth = parse(monthsArray[0], 'yyyy-MM', new Date());
            const lastMonth = parse(monthsArray[monthsArray.length - 1], 'yyyy-MM', new Date());
            const firstMonthName = format(firstMonth, 'MMMM', { locale: ptBR });
            const firstYear = format(firstMonth, 'yyyy', { locale: ptBR });
            const lastMonthName = format(lastMonth, 'MMMM', { locale: ptBR });
            const lastYear = format(lastMonth, 'yyyy', { locale: ptBR });
            return `${firstMonthName.charAt(0).toUpperCase() + firstMonthName.slice(1)}/${firstYear} a ${lastMonthName.charAt(0).toUpperCase() + lastMonthName.slice(1)}/${lastYear}`;
        } catch {
            return `${monthsArray[0]} a ${monthsArray[monthsArray.length - 1]}`;
        }
    }, [selectedMonths, availableMonths.length]);

    // Initialize selectedMonths with all available months
    React.useEffect(() => {
        if (availableMonths.length > 0 && selectedMonths.size === 0) {
            setSelectedMonths(new Set(availableMonths));
        }
    }, [availableMonths]);


    // Separate mothers and children - filter out items with count = 0
    // Estrutura: nível 0 (mãe 4 dígitos) -> nível 1 (child_nature > 4 dígitos) -> nível 2 (SE2010)
    const { mothers, childrenByMother, grandchildrenByChild } = useMemo(() => {
        // Filter out items with count = 0
        const filteredData = data.filter(item => item.count > 0);
        
        // Mães são itens de nível 0 (PAD_NATURE de 4 dígitos)
        const mothersList = filteredData.filter(item => item.isMother && item.level === 0);
        const childrenMap: Record<string, HierarchicalItem[]> = {}; // Filhos diretos das mães (nível 1)
        const grandchildrenMap: Record<string, HierarchicalItem[]> = {}; // Filhos dos filhos (nível 2)
        
        filteredData.forEach(item => {
            if (!item.isMother) {
                // É um filho (nível 2 - SE2010)
                if (item.motherId) {
                    if (!grandchildrenMap[item.motherId]) {
                        grandchildrenMap[item.motherId] = [];
                    }
                    grandchildrenMap[item.motherId].push(item);
                }
            } else if (item.isMother && item.level === 1 && item.motherId) {
                // É uma mãe intermediária (nível 1 - child_nature > 4 dígitos)
                if (!childrenMap[item.motherId]) {
                    childrenMap[item.motherId] = [];
                }
                childrenMap[item.motherId].push(item);
            }
        });
        
        return { mothers: mothersList, childrenByMother: childrenMap, grandchildrenByChild: grandchildrenMap };
    }, [data]);


    // Filter by selected months - only apply if months are selected
    const filteredByMonths = useMemo(() => {
        // If no months selected or all months selected, show all data
        if (selectedMonths.size === 0 || selectedMonths.size === availableMonths.length) {
            return { mothers, childrenByMother, grandchildrenByChild };
        }
        
        const monthSet = new Set(selectedMonths);
        const filteredMothers: HierarchicalItem[] = [];
        const filteredChildren: Record<string, HierarchicalItem[]> = {};
        const filteredGrandchildren: Record<string, HierarchicalItem[]> = {};
        
        mothers.forEach(mother => {
            const itemDates = mother.dates || [];
            
            // Check if mother has dates in selected months
            const hasDateInSelectedMonths = itemDates.length === 0 || itemDates.some(date => {
                if (date && date.length >= 8) {
                    const monthKey = `${date.substring(0, 4)}-${date.substring(4, 6)}`;
                    return monthSet.has(monthKey);
                }
                return false;
            });
            
            if (hasDateInSelectedMonths) {
                // Check children (nível 1)
                const children = (childrenByMother[mother.id] || []).filter(child => {
                    const childDates = child.dates || [];
                    if (childDates.length === 0) return true; // Include if no dates
                    return childDates.some(date => {
                        if (date && date.length >= 8) {
                            const monthKey = `${date.substring(0, 4)}-${date.substring(4, 6)}`;
                            return monthSet.has(monthKey);
                        }
                        return false;
                    });
                });
                
                // Filter grandchildren for each child
                const filteredChildGrandchildren: Record<string, HierarchicalItem[]> = {};
                children.forEach(child => {
                    const grandchildren = (grandchildrenByChild[child.id] || []).filter(grandchild => {
                        const grandchildDates = grandchild.dates || [];
                        if (grandchildDates.length === 0) return true;
                        return grandchildDates.some(date => {
                            if (date && date.length >= 8) {
                                const monthKey = `${date.substring(0, 4)}-${date.substring(4, 6)}`;
                                return monthSet.has(monthKey);
                            }
                            return false;
                        });
                    });
                    if (grandchildren.length > 0) {
                        filteredChildGrandchildren[child.id] = grandchildren;
                    }
                });
                
                // Only add mother if it has children or its own dates match
                if (children.length > 0 || hasDateInSelectedMonths) {
                    filteredMothers.push(mother);
                    if (children.length > 0) {
                        filteredChildren[mother.id] = children;
                    }
                    Object.assign(filteredGrandchildren, filteredChildGrandchildren);
                }
            }
        });
        
        return { mothers: filteredMothers, childrenByMother: filteredChildren, grandchildrenByChild: filteredGrandchildren };
    }, [mothers, childrenByMother, grandchildrenByChild, selectedMonths, availableMonths.length]);

    // Sort mothers
    const sortedMothers = useMemo(() => {
        const sorted = [...filteredByMonths.mothers].sort((a, b) => {
            switch (sortBy) {
                case 'value':
                    return b.value - a.value;
                case 'count':
                    return b.count - a.count;
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
        return sorted;
    }, [filteredByMonths.mothers, sortBy]);

    // Filter by search term - filtra mães, filhos e netos
    const { filteredMothers, filteredChildrenByMother, filteredGrandchildrenByChild } = useMemo(() => {
        if (!searchTerm) {
            return {
                filteredMothers: sortedMothers,
                filteredChildrenByMother: filteredByMonths.childrenByMother,
                filteredGrandchildrenByChild: filteredByMonths.grandchildrenByChild
            };
        }
        
        const term = searchTerm.toLowerCase();
        const filteredMothersList: HierarchicalItem[] = [];
        const filteredChildrenMap: Record<string, HierarchicalItem[]> = {};
        const filteredGrandchildrenMap: Record<string, HierarchicalItem[]> = {};
        
        sortedMothers.forEach(mother => {
            const matchesMother = mother.name.toLowerCase().includes(term);
            const children = filteredByMonths.childrenByMother[mother.id] || [];
            const filteredChildren: HierarchicalItem[] = [];
            
            children.forEach(child => {
                const matchesChild = child.name.toLowerCase().includes(term);
                const grandchildren = filteredByMonths.grandchildrenByChild[child.id] || [];
                const filteredGrandchildren = grandchildren.filter(grandchild =>
                    grandchild.name.toLowerCase().includes(term)
                );
                const matchesGrandchildren = filteredGrandchildren.length > 0;
                
                // Incluir filho se ele corresponde OU tem netos que correspondem
                if (matchesChild || matchesGrandchildren) {
                    filteredChildren.push(child);
                    if (filteredGrandchildren.length > 0) {
                        filteredGrandchildrenMap[child.id] = filteredGrandchildren;
                    }
                }
            });
            
            // Incluir mãe se ela corresponde OU tem filhos/netos que correspondem
            if (matchesMother || filteredChildren.length > 0) {
                filteredMothersList.push(mother);
                if (filteredChildren.length > 0) {
                    filteredChildrenMap[mother.id] = filteredChildren;
                }
            }
        });
        
        return {
            filteredMothers: filteredMothersList,
            filteredChildrenByMother: filteredChildrenMap,
            filteredGrandchildrenByChild: filteredGrandchildrenMap
        };
    }, [sortedMothers, searchTerm, filteredByMonths.childrenByMother, filteredByMonths.grandchildrenByChild]);

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
        setChildrenPages({}); // Reset paginação dos filhos também
        setGrandchildrenPages({}); // Reset paginação dos netos também
    }, [searchTerm, selectedMonths, sortBy]);

    // Get paginated mothers for current page
    const paginatedMothers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredMothers.slice(start, end);
    }, [filteredMothers, currentPage, itemsPerPage]);

    const toggleMother = (motherId: string) => {
        setExpandedMothers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(motherId)) {
                newSet.delete(motherId);
                // Remove paginação quando colapsa
                setChildrenPages(prevPages => {
                    const newPages = { ...prevPages };
                    delete newPages[motherId];
                    return newPages;
                });
                // Também colapsa filhos expandidos
                const children = childrenByMother[motherId] || [];
                children.forEach(child => {
                    newSet.delete(child.id);
                });
                setExpandedChildren(prevExpanded => {
                    const newExpanded = new Set(prevExpanded);
                    children.forEach(child => {
                        newExpanded.delete(child.id);
                        // Remove paginação dos netos
                        setGrandchildrenPages(prevPages => {
                            const newPages = { ...prevPages };
                            delete newPages[child.id];
                            return newPages;
                        });
                    });
                    return newExpanded;
                });
            } else {
                newSet.add(motherId);
                // Inicia na página 1 quando expande
                setChildrenPages(prevPages => ({
                    ...prevPages,
                    [motherId]: 1
                }));
            }
            return newSet;
        });
    };

    const toggleChild = (childId: string) => {
        setExpandedChildren(prev => {
            const newSet = new Set(prev);
            if (newSet.has(childId)) {
                newSet.delete(childId);
                // Remove paginação quando colapsa
                setGrandchildrenPages(prevPages => {
                    const newPages = { ...prevPages };
                    delete newPages[childId];
                    return newPages;
                });
            } else {
                newSet.add(childId);
                // Inicia na página 1 quando expande
                setGrandchildrenPages(prevPages => ({
                    ...prevPages,
                    [childId]: 1
                }));
            }
            return newSet;
        });
    };

    const setChildrenPage = (motherId: string, page: number) => {
        setChildrenPages(prev => ({
            ...prev,
            [motherId]: page
        }));
    };

    const setGrandchildrenPage = (childId: string, page: number) => {
        setGrandchildrenPages(prev => ({
            ...prev,
            [childId]: page
        }));
    };

    const toggleMonth = (month: string) => {
        setSelectedMonths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(month)) {
                newSet.delete(month);
            } else {
                newSet.add(month);
            }
            return newSet;
        });
    };

    const selectAllMonths = () => {
        setSelectedMonths(new Set(availableMonths));
    };

    const clearAllMonths = () => {
        setSelectedMonths(new Set());
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr || dateStr.length < 8) return '';
        try {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            // Validate date parts
            if (!year || !month || !day || year.length !== 4 || month.length !== 2 || day.length !== 2) {
                return '';
            }
            const date = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
            if (isNaN(date.getTime())) {
                return '';
            }
            return format(date, 'dd/MM/yyyy', { locale: ptBR });
        } catch {
            return '';
        }
    };

    const formatMonthLabel = (monthKey: string): string => {
        try {
            const date = parse(monthKey, 'yyyy-MM', new Date());
            return format(date, 'MMM/yyyy', { locale: ptBR });
        } catch {
            return monthKey;
        }
    };

    const getFirstDate = (item: HierarchicalItem): string => {
        const dates = item.dates || [];
        if (dates.length === 0) return '';
        const sortedDates = [...dates].sort();
        return formatDate(sortedDates[0]);
    };

    const totalPages = Math.ceil(filteredMothers.length / itemsPerPage);

    if (data.length === 0) {
        return (
            <Card className="shadow-sm border-border/50 bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                            <PieChart className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">
                                Gastos por Item
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {periodLabel || "Nenhum período selecionado"}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px] w-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                            <div className="p-4 rounded-full bg-muted/50 mx-auto w-fit">
                                <PieChart className="h-8 w-8 text-muted-foreground opacity-50" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                    Nenhum gasto registrado
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {periodLabel || "Nenhum período selecionado"}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                            <PieChart className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">
                                Gastos por Item
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {periodLabel || "Período selecionado"} - Estrutura hierárquica
                            </CardDescription>
                        </div>
                    </div>
                    {total !== undefined && total > 0 && (
                        <div className="text-left sm:text-right w-full sm:w-auto">
                            <div className="text-xs text-muted-foreground">Total no Período</div>
                            <div className="text-lg font-bold text-cyan-600">
                                {formatCurrency(total)}
                            </div>
                            {totalTransactions !== undefined && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    {totalTransactions} {totalTransactions === 1 ? 'pagamento' : 'pagamentos'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pb-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Buscar item..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 w-full"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <ExportHierarchicalButton
                            data={filteredMothers}
                            childrenByMother={filteredChildrenByMother}
                            grandchildrenByChild={filteredGrandchildrenByChild}
                            projectName={projectName}
                            projectCode={projectCode}
                            type="gastos"
                        />
                        <Select value={sortBy} onValueChange={(v: 'value' | 'count' | 'name') => {
                            setSortBy(v);
                            setCurrentPage(1);
                        }}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <ArrowUpDown className="h-4 w-4 mr-2 shrink-0" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="value">Por Valor</SelectItem>
                                <SelectItem value="count">Por Quantidade</SelectItem>
                                <SelectItem value="name">Por Nome</SelectItem>
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                                    <Calendar className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">
                                        {selectedMonths.size === 0 
                                            ? "Selecionar meses"
                                            : selectedMonths.size === availableMonths.length
                                            ? "Todos os meses"
                                            : `${selectedMonths.size} mês${selectedMonths.size > 1 ? 'es' : ''} selecionado${selectedMonths.size > 1 ? 's' : ''}`
                                        }
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <div className="p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium">Filtrar por Mês</h4>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={selectAllMonths}
                                            >
                                                Todos
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={clearAllMonths}
                                            >
                                                Limpar
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                                        {availableMonths.map((month) => (
                                            <label
                                                key={month}
                                                className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer transition-colors"
                                            >
                                                <Checkbox
                                                    checked={selectedMonths.has(month)}
                                                    onCheckedChange={() => {
                                                        toggleMonth(month);
                                                        setCurrentPage(1);
                                                    }}
                                                />
                                                <span className="text-sm">{formatMonthLabel(month)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Select 
                            value={itemsPerPage.toString()} 
                            onValueChange={(v) => {
                                setItemsPerPage(v === 'all' ? 9999 : parseInt(v));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5 por página</SelectItem>
                                <SelectItem value="10">10 por página</SelectItem>
                                <SelectItem value="15">15 por página</SelectItem>
                                <SelectItem value="20">20 por página</SelectItem>
                                <SelectItem value="all">Todos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="font-semibold">Item</TableHead>
                                <TableHead className="text-right font-semibold hidden sm:table-cell">Valor</TableHead>
                                <TableHead className="text-right font-semibold hidden md:table-cell">Qtd</TableHead>
                                <TableHead className="w-[120px] font-semibold hidden xl:table-cell">Emissão</TableHead>
                                <TableHead className="w-[120px] font-semibold hidden xl:table-cell">Baixa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedMothers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 h-[200px]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-3 rounded-full bg-muted/50">
                                                <Search className="h-6 w-6 text-muted-foreground/50" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-foreground">
                                                    Nenhum item encontrado
                                                </p>
                                                {(searchTerm || selectedMonths.size > 0 && selectedMonths.size < availableMonths.length) && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {searchTerm 
                                                            ? 'Tente ajustar o termo de busca ou os filtros selecionados'
                                                            : 'Tente ajustar os filtros de mês selecionados'
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                {(() => {
                                    const rows: React.ReactNode[] = [];
                                    const start = (currentPage - 1) * itemsPerPage;
                                    const end = start + itemsPerPage;
                                    const paginatedMothers = filteredMothers.slice(start, end);
                                    
                                    paginatedMothers.forEach((mother) => {
                                        const isExpanded = expandedMothers.has(mother.id);
                                        const hasChildren = (filteredChildrenByMother[mother.id] || []).length > 0;
                                        
                                        // Adicionar linha da mãe
                                        rows.push(
                                            <TableRow
                                                key={mother.id}
                                                className={cn(
                                                    "bg-muted/30 font-medium hover:bg-muted/40",
                                                    "transition-colors duration-150"
                                                )}
                                            >
                                                <TableCell>
                                                    {hasChildren ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 hover:bg-muted transition-colors"
                                                            onClick={() => toggleMother(mother.id)}
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <div className="w-6" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-semibold text-foreground">
                                                                {mother.name}
                                                            </span>
                                                            <div className="flex gap-3 sm:hidden text-xs text-muted-foreground">
                                                                <span>{formatCurrency(mother.value)}</span>
                                                                <span>•</span>
                                                                <span>{mother.count} {mother.count === 1 ? 'item' : 'itens'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium hidden sm:table-cell">
                                                    {formatCurrency(mother.value)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                                                    {mother.count}
                                                </TableCell>
                                            </TableRow>
                                        );
                                        
                                        // Se expandida, adicionar filhos (nível 1) paginados
                                        if (isExpanded && hasChildren) {
                                            const allChildren = (filteredChildrenByMother[mother.id] || []).sort((a, b) => {
                                                switch (sortBy) {
                                                    case 'value':
                                                        return b.value - a.value;
                                                    case 'count':
                                                        return b.count - a.count;
                                                    case 'name':
                                                        return a.name.localeCompare(b.name);
                                                    default:
                                                        return 0;
                                                }
                                            });
                                            
                                            const currentChildrenPage = childrenPages[mother.id] || 1;
                                            const childrenStart = (currentChildrenPage - 1) * childrenPerPage;
                                            const childrenEnd = childrenStart + childrenPerPage;
                                            const paginatedChildren = allChildren.slice(childrenStart, childrenEnd);
                                            const totalChildrenPages = Math.ceil(allChildren.length / childrenPerPage);
                                            
                                            // Adicionar filhos (nível 1 - child_nature) paginados
                                            paginatedChildren.forEach((child) => {
                                                const isChildExpanded = expandedChildren.has(child.id);
                                                const hasGrandchildren = (filteredGrandchildrenByChild[child.id] || []).length > 0;
                                                
                                                rows.push(
                                                    <TableRow
                                                        key={child.id}
                                                        className={cn(
                                                            "hover:bg-muted/20",
                                                            "transition-colors duration-150",
                                                            "bg-muted/10"
                                                        )}
                                                    >
                                                        <TableCell>
                                                            <div className="flex items-center gap-2 pl-4">
                                                                {hasGrandchildren ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 w-6 p-0 hover:bg-muted transition-colors"
                                                                        onClick={() => toggleChild(child.id)}
                                                                    >
                                                                        {isChildExpanded ? (
                                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                        )}
                                                                    </Button>
                                                                ) : (
                                                                    <div className="w-6" />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className={cn(
                                                                "flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2",
                                                                "pl-4 sm:pl-6"
                                                            )}>
                                                                <span className="text-muted-foreground/60 text-lg leading-none hidden sm:inline">├─</span>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-foreground/90 font-medium">
                                                                        {child.name}
                                                                    </span>
                                                                    <div className="flex gap-3 sm:hidden text-xs text-muted-foreground">
                                                                        <span>{formatCurrency(child.value)}</span>
                                                                        <span>•</span>
                                                                        <span>{child.count} {child.count === 1 ? 'item' : 'itens'}</span>
                                                                        {getFirstDate(child) && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span>{getFirstDate(child)}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium hidden sm:table-cell">
                                                            {formatCurrency(child.value)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                                                            {child.count}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                                
                                                // Se o filho está expandido, adicionar netos (nível 2 - SE2010)
                                                if (isChildExpanded && hasGrandchildren) {
                                                    const allGrandchildren = (filteredGrandchildrenByChild[child.id] || []).sort((a, b) => {
                                                        switch (sortBy) {
                                                            case 'value':
                                                                return b.value - a.value;
                                                            case 'count':
                                                                return b.count - a.count;
                                                            case 'name':
                                                                return a.name.localeCompare(b.name);
                                                            default:
                                                                return 0;
                                                        }
                                                    });
                                                    
                                                    const currentGrandchildrenPage = grandchildrenPages[child.id] || 1;
                                                    const grandchildrenStart = (currentGrandchildrenPage - 1) * grandchildrenPerPage;
                                                    const grandchildrenEnd = grandchildrenStart + grandchildrenPerPage;
                                                    const paginatedGrandchildren = allGrandchildren.slice(grandchildrenStart, grandchildrenEnd);
                                                    const totalGrandchildrenPages = Math.ceil(allGrandchildren.length / grandchildrenPerPage);
                                                    
                                                    // Adicionar netos (nível 2) paginados
                                                    paginatedGrandchildren.forEach((grandchild) => {
                                                        rows.push(
                                                            <TableRow
                                                                key={grandchild.id}
                                                                className={cn(
                                                                    "hover:bg-muted/20",
                                                                    "transition-colors duration-150"
                                                                )}
                                                            >
                                                                <TableCell>
                                                                    <div className="w-6 pl-8" />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className={cn(
                                                                        "flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2",
                                                                        "pl-8 sm:pl-12"
                                                                    )}>
                                                                        <span className="text-muted-foreground/60 text-lg leading-none hidden sm:inline">└─</span>
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-foreground/80">
                                                                                {grandchild.name}
                                                                            </span>
                                                                            <div className="flex gap-3 sm:hidden text-xs text-muted-foreground">
                                                                                <span>{formatCurrency(grandchild.value)}</span>
                                                                                <span>•</span>
                                                                                <span>{grandchild.count} {grandchild.count === 1 ? 'item' : 'itens'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium hidden sm:table-cell">
                                                                    {formatCurrency(grandchild.value)}
                                                                </TableCell>
                                                                <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                                                                    {grandchild.count}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">
                                                                    {grandchild.emissao ? formatDate(grandchild.emissao) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">
                                                                    {grandchild.baixa ? formatDate(grandchild.baixa) : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    });
                                                    
                                                    // Adicionar paginação dos netos se houver mais de uma página
                                                    if (totalGrandchildrenPages > 1) {
                                                        rows.push(
                                                            <TableRow key={`grandchildren-pagination-${child.id}`} className="bg-muted/15">
                                                                <TableCell colSpan={6} className="px-4 py-2 pl-8">
                                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                                        <div className="text-xs text-muted-foreground">
                                                                            Mostrando netos <span className="font-medium">{((currentGrandchildrenPage - 1) * grandchildrenPerPage) + 1}</span>-
                                                                            <span className="font-medium">{Math.min(currentGrandchildrenPage * grandchildrenPerPage, allGrandchildren.length)}</span> de <span className="font-medium">{allGrandchildren.length}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-6 px-2 text-xs"
                                                                                onClick={() => setGrandchildrenPage(child.id, Math.max(1, currentGrandchildrenPage - 1))}
                                                                                disabled={currentGrandchildrenPage === 1}
                                                                            >
                                                                                ‹
                                                                            </Button>
                                                                            <span className="text-xs text-muted-foreground px-2 min-w-[60px] text-center">
                                                                                {currentGrandchildrenPage} / {totalGrandchildrenPages}
                                                                            </span>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-6 px-2 text-xs"
                                                                                onClick={() => setGrandchildrenPage(child.id, Math.min(totalGrandchildrenPages, currentGrandchildrenPage + 1))}
                                                                                disabled={currentGrandchildrenPage === totalGrandchildrenPages}
                                                                            >
                                                                                ›
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    }
                                                }
                                            });
                                            
                                            // Adicionar paginação dos filhos se houver mais de uma página
                                            if (totalChildrenPages > 1) {
                                                rows.push(
                                                    <TableRow key={`children-pagination-${mother.id}`} className="bg-muted/20">
                                                        <TableCell colSpan={6} className="px-4 py-2">
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <div className="text-xs text-muted-foreground">
                                                                    Mostrando filhos <span className="font-medium">{((currentChildrenPage - 1) * childrenPerPage) + 1}</span>-
                                                                    <span className="font-medium">{Math.min(currentChildrenPage * childrenPerPage, allChildren.length)}</span> de <span className="font-medium">{allChildren.length}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 px-2 text-xs"
                                                                        onClick={() => setChildrenPage(mother.id, Math.max(1, currentChildrenPage - 1))}
                                                                        disabled={currentChildrenPage === 1}
                                                                    >
                                                                        ‹
                                                                    </Button>
                                                                    <span className="text-xs text-muted-foreground px-2 min-w-[60px] text-center">
                                                                        {currentChildrenPage} / {totalChildrenPages}
                                                                    </span>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 px-2 text-xs"
                                                                        onClick={() => setChildrenPage(mother.id, Math.min(totalChildrenPages, currentChildrenPage + 1))}
                                                                        disabled={currentChildrenPage === totalChildrenPages}
                                                                    >
                                                                        ›
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }
                                        }
                                    });
                                    
                                    return rows;
                                })()}
                                </>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </div>

                {/* Pagination */}
                {filteredMothers.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between flex-wrap gap-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground text-center sm:text-left">
                            Mostrando <span className="font-medium text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span>-
                            <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredMothers.length)}</span> de <span className="font-medium text-foreground">{filteredMothers.length}</span> {filteredMothers.length === 1 ? 'item' : 'itens'}
                            {totalPages > 1 && <span className="hidden sm:inline"> (página {currentPage} de {totalPages})</span>}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="transition-all disabled:opacity-50"
                                >
                                    <span className="hidden sm:inline">Anterior</span>
                                    <span className="sm:hidden">Ant</span>
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                className="w-8 h-8 p-0 transition-all"
                                                onClick={() => setCurrentPage(pageNum)}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="transition-all disabled:opacity-50"
                                >
                                    <span className="hidden sm:inline">Próximo</span>
                                    <span className="sm:hidden">Próx</span>
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
