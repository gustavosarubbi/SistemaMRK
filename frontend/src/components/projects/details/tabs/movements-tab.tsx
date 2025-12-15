'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Calendar, ChevronDown, ChevronUp, RefreshCw, Wallet, CalendarRange, Table2 } from 'lucide-react';
import { PeriodFilterDropdown } from '../period-filter-dropdown';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { ExportButton } from '../export-button';
import { ExportHierarchicalButton } from '../export-hierarchical-button';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthlyExpensesChart } from '../charts/monthly-expenses-chart';
import { ExpensesByItemChart } from '../charts/expenses-by-item-chart';
import { ExpensesByItemHierarchicalChart } from '../charts/expenses-by-item-hierarchical-chart';
import { Checkbox } from '@/components/ui/checkbox';

interface MovementsTabProps {
    movements: any[];
    isLoading: boolean;
    error: any;
    formatDate: (dateStr: string) => string;
    projectName: string;
    projectCode: string;
}

export function MovementsTab({ movements, isLoading, error, formatDate, projectName, projectCode }: MovementsTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [descriFilter, setDescriFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<'descri' | 'value'>('descri');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set()); // Set of YYYY-MM strings
    const [clickedMonth, setClickedMonth] = useState<string | null>(null);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Fetch expenses from SE2010 - always visible, filtered by selected months if any
    const { data: expensesData } = useQuery<{ expenses_by_subrub: Record<string, number>; total: number }>({
        queryKey: ['movements-expenses', projectCode, Array.from(selectedMonths).sort().join(',')],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedMonths.size > 0) {
                // Convert selected months to date range
                const monthsArray = Array.from(selectedMonths).sort();
                const firstMonth = monthsArray[0];
                const lastMonth = monthsArray[monthsArray.length - 1];
                
                // First day of first month
                const startDate = parse(`${firstMonth}-01`, 'yyyy-MM-dd', new Date());
                // Last day of last month
                const lastDay = new Date(parse(`${lastMonth}-01`, 'yyyy-MM-dd', new Date()));
                lastDay.setMonth(lastDay.getMonth() + 1);
                lastDay.setDate(0); // Last day of the month
                
                params.append('start_date', format(startDate, 'yyyyMMdd'));
                params.append('end_date', format(lastDay, 'yyyyMMdd'));
            }
            // If no months selected, don't pass date filters - will return all expenses
            const res = await api.get(`/movements/${projectCode}/expenses?${params.toString()}`);
            return res.data;
        },
        enabled: !!projectCode, // Always enabled when projectCode exists
        staleTime: 60000,
        gcTime: 300000,
        refetchOnWindowFocus: false,
    });

    const expensesBySubrub = expensesData?.expenses_by_subrub || {};

    // Fetch total geral - sempre sem filtros de período
    const { data: totalGeralData } = useQuery<{ total: number }>({
        queryKey: ['movements-total-geral', projectCode],
        queryFn: async () => {
            // Sempre buscar sem filtros de data para ter o total completo
            const res = await api.get(`/movements/${projectCode}/expenses-with-count`);
            return res.data;
        },
        enabled: !!projectCode,
        staleTime: 60000,
        gcTime: 300000,
        refetchOnWindowFocus: false,
    });

    // Fetch expenses by month - Always from the beginning, regardless of date filters
    // Esta query precisa vir antes para termos os meses disponíveis
    const { data: expensesByMonthData, isLoading: isLoadingExpensesByMonth, error: errorExpensesByMonth } = useQuery<{ expenses_by_month: Record<string, number>; total: number }>({
        queryKey: ['movements-expenses-by-month', projectCode], // Remove date filters from key
        queryFn: async () => {
            try {
                // Don't pass date filters - always get all data from the beginning
                const res = await api.get(`/movements/${projectCode}/expenses-by-month`);
                return res.data || { expenses_by_month: {}, total: 0 };
            } catch (error: any) {
                console.error('Error fetching expenses by month:', error);
                // Return empty data structure instead of throwing
                return { expenses_by_month: {}, total: 0 };
            }
        },
        enabled: !!projectCode,
        staleTime: 60000,
        gcTime: 300000,
        refetchOnWindowFocus: false,
        retry: 2, // Retry up to 2 times on failure
    });

    const expensesByMonth = expensesByMonthData?.expenses_by_month || {};

    // Fetch expenses with count from SE2010 - always visible, filtered by selected months if any
    const { data: expensesWithCountData } = useQuery<{ 
        expenses_by_subrub: Record<string, number>; 
        count_by_subrub: Record<string, number>;
        histor_by_subrub: Record<string, string>;
        data_by_subrub: Record<string, string[]>;
        category_by_subrub: Record<string, string>;
        available_months: string[];
        total: number;
        total_transactions: number;
    }>({
        queryKey: ['movements-expenses-count', projectCode, Array.from(selectedMonths).sort().join(','), expensesByMonthData ? Object.keys(expensesByMonthData.expenses_by_month || {}).length : 0],
        queryFn: async () => {
            const params = new URLSearchParams();
            
            // Verificar se TODOS os meses disponíveis estão selecionados
            // Usar expensesByMonthData diretamente, não expensesByMonth que pode não estar disponível
            const expensesByMonthInQuery = expensesByMonthData?.expenses_by_month || {};
            const totalMonthsAvailable = Object.keys(expensesByMonthInQuery).length;
            const allMonthsSelected = selectedMonths.size > 0 && 
                                      totalMonthsAvailable > 0 &&
                                      selectedMonths.size === totalMonthsAvailable;
            
            // Se todos estão selecionados OU nenhum está selecionado, não passar filtros
            if (selectedMonths.size > 0 && !allMonthsSelected) {
                // Apenas quando há seleção parcial, aplicar filtros de data
                const monthsArray = Array.from(selectedMonths).sort();
                const firstMonth = monthsArray[0];
                const lastMonth = monthsArray[monthsArray.length - 1];
                
                // First day of first month
                const startDate = parse(`${firstMonth}-01`, 'yyyy-MM-dd', new Date());
                // Last day of last month
                const lastDay = new Date(parse(`${lastMonth}-01`, 'yyyy-MM-dd', new Date()));
                lastDay.setMonth(lastDay.getMonth() + 1);
                lastDay.setDate(0); // Last day of the month
                
                params.append('start_date', format(startDate, 'yyyyMMdd'));
                params.append('end_date', format(lastDay, 'yyyyMMdd'));
            }
            // Se todos ou nenhum selecionado, não passa filtros = retorna tudo
            
            const res = await api.get(`/movements/${projectCode}/expenses-with-count?${params.toString()}`);
            return res.data;
        },
        enabled: !!projectCode && !!expensesByMonthData, // Wait for expensesByMonthData to be available
        staleTime: 60000,
        gcTime: 300000,
        refetchOnWindowFocus: false,
    });
    
    // Get sorted list of months with expenses
    const availableMonths = useMemo(() => {
        if (!expensesByMonth || Object.keys(expensesByMonth).length === 0) {
            return [];
        }
        return Object.keys(expensesByMonth)
            .sort((a, b) => a.localeCompare(b))
            .map(month => {
                try {
                    const monthDate = parse(month, 'yyyy-MM', new Date());
                    return {
                        key: month,
                        label: format(monthDate, 'MMM/yyyy', { locale: ptBR }),
                        value: expensesByMonth[month]
                    };
                } catch (error) {
                    console.error(`Error parsing month ${month}:`, error);
                    return {
                        key: month,
                        label: month,
                        value: expensesByMonth[month]
                    };
                }
            });
    }, [expensesByMonth]);
    
    // Não inicializar automaticamente - começar vazio
    
    const toggleMonth = (monthKey: string) => {
        setSelectedMonths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(monthKey)) {
                newSet.delete(monthKey);
            } else {
                newSet.add(monthKey);
            }
            return newSet;
        });
    };
    
    const selectAllMonths = () => {
        setSelectedMonths(new Set(availableMonths.map(m => m.key)));
    };
    
    const clearAllMonths = () => {
        setSelectedMonths(new Set());
    };

    // Handle month click from chart
    const handleMonthClick = (month: string) => {
        setClickedMonth(month);
        // Filter table to show only that month
        setSelectedMonths(new Set([month]));
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSearchTerm('');
        setDescriFilter('all');
        setSelectedMonths(new Set(availableMonths.map(m => m.key)));
        setClickedMonth(null);
    };

    // Check if there are active filters
    const hasActiveFilters = searchTerm !== '' || descriFilter !== 'all' || 
        (selectedMonths.size > 0 && selectedMonths.size < availableMonths.length);
    const activeFiltersCount = [
        searchTerm !== '' ? 1 : 0,
        descriFilter !== 'all' ? 1 : 0,
        selectedMonths.size > 0 && selectedMonths.size < availableMonths.length ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    // Helper function for semantic colors
    const getValueColor = (value: number) => {
        if (value > 0) return "text-emerald-500";
        if (value < 0) return "text-red-500";
        return "text-muted-foreground";
    };

    // Format month by full name
    const formatMonthFull = (monthKey: string): string => {
        try {
            const monthDate = parse(monthKey, 'yyyy-MM', new Date());
            const monthName = format(monthDate, 'MMMM', { locale: ptBR });
            const year = format(monthDate, 'yyyy', { locale: ptBR });
            return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} - ${year}`;
        } catch {
            return monthKey;
        }
    };


    // Format period label for charts
    const periodLabel = useMemo(() => {
        if (selectedMonths.size === 0) return 'Todos os períodos';
        if (selectedMonths.size === 1) {
            const month = Array.from(selectedMonths)[0];
            return formatMonthFull(month);
        }
        if (selectedMonths.size === availableMonths.length) {
            return 'Todo o período';
        }
        const monthsArray = Array.from(selectedMonths).sort();
        const firstMonth = formatMonthFull(monthsArray[0]);
        const lastMonth = formatMonthFull(monthsArray[monthsArray.length - 1]);
        return `${firstMonth} a ${lastMonth}`;
    }, [selectedMonths, availableMonths.length]);

    // Helper function to match E2_SUBRUB (from SE2010) with PAD_NATURE
    // E2_SUBRUB (3 dígitos) corresponde aos últimos 3 dígitos de PAD_NATURE
    // Exemplo: PAD_NATURE = "0062" -> últimos 3 = "062", então E2_SUBRUB = "062"
    // Exemplo: PAD_NATURE = "00620001" -> últimos 3 = "001", então E2_SUBRUB = "001"
    const getExpenseForNature = (nature: string): number => {
        if (!nature || nature.length < 3) return 0;
        
        const natureStr = String(nature).trim();
        
        // Use last 3 digits to match with E2_SUBRUB (from SE2010)
        if (natureStr.length >= 3) {
            const last3 = natureStr.slice(-3);
            if (expensesBySubrub[last3]) {
                return expensesBySubrub[last3];
            }
        }
        
        return 0;
    };

    // Organize movements: 4 digits (except '0001') are parents, longer codes starting with those 4 digits are children
    const { mothers, childrenByMother } = useMemo(() => {
        const mothersList: any[] = [];
        const childrenMap: Record<string, any[]> = {};
        
        // First pass: identify mothers (exactly 4 digits, except '0001')
        movements.forEach((mov: any) => {
            const nature = String(mov.PAD_NATURE || '').trim();
            
            if (nature.length === 4 && nature !== '0001') {
                mothersList.push(mov);
                if (!childrenMap[nature]) {
                    childrenMap[nature] = [];
                }
            }
        });
        
        // Second pass: associate children to mothers
        movements.forEach((mov: any) => {
            const nature = String(mov.PAD_NATURE || '').trim();
            
            // Check if it's a child (more than 4 digits)
            if (nature.length > 4) {
                const motherNature = nature.substring(0, 4);
                if (childrenMap[motherNature]) {
                    childrenMap[motherNature].push(mov);
                }
            }
        });
        
        return { mothers: mothersList, childrenByMother: childrenMap };
    }, [movements]);

    // Get unique descriptions for filter (only from mothers)
    const uniqueDescriptions = useMemo(() => {
        const descriptions = new Set(mothers.map((m: any) => m.PAD_DESCRI).filter(Boolean));
        return Array.from(descriptions).sort();
    }, [mothers]);

    // Prepare data for expenses by item chart
    const expensesByItemData = useMemo(() => {
        if (!expensesBySubrub || Object.keys(expensesBySubrub).length === 0) {
            return [];
        }

        // Map E2_SUBRUB (from SE2010) to PAD_DESCRI using mothers (main categories)
        const itemMap: Record<string, { name: string; value: number }> = {};

        Object.entries(expensesBySubrub).forEach(([subrub, value]) => {
            // Use histor from expensesWithCountData first (já vem do backend com PAD_DESCRI correto)
            const historBySubrub = expensesWithCountData?.histor_by_subrub || {};
            let itemName = historBySubrub[subrub] || '';
            
            // Se histor está vazio ou é apenas código numérico, buscar descrição do PAD_NATURE
            if (!itemName || itemName.trim() === '' || /^\d+$/.test(itemName.trim())) {
                // Primeiro tentar match exato (subrub === PAD_NATURE) - para casos como "0060"
                let matchingMovement = mothers.find((mov: any) => {
                    const nature = String(mov.PAD_NATURE || '').trim();
                    return nature === subrub;
                });

                // Se não encontrou match exato, tentar pelos últimos 3 dígitos
                if (!matchingMovement) {
                    matchingMovement = mothers.find((mov: any) => {
                        const nature = String(mov.PAD_NATURE || '').trim();
                        if (nature.length >= 3) {
                            const last3 = nature.slice(-3);
                            return last3 === subrub;
                        }
                        return false;
                    });
                }

                // Se ainda não encontrou, tentar em todos os movimentos
                if (!matchingMovement) {
                    matchingMovement = movements.find((mov: any) => {
                        const nature = String(mov.PAD_NATURE || '').trim();
                        return nature === subrub || (nature.length >= 3 && nature.slice(-3) === subrub);
                    });
                }

                // Usar PAD_DESCRI do movimento encontrado
                if (matchingMovement?.PAD_DESCRI) {
                    itemName = matchingMovement.PAD_DESCRI;
                } else {
                    itemName = `Item ${subrub}`;
                }
            }
            
            if (itemMap[itemName]) {
                itemMap[itemName].value += value;
            } else {
                itemMap[itemName] = {
                    name: itemName,
                    value: value,
                };
            }
        });

        return Object.values(itemMap);
    }, [expensesBySubrub, mothers, movements, expensesWithCountData]);

    // Prepare hierarchical expenses data
    // Nova estrutura de 3 níveis: Mãe (4 dígitos) -> Mãe(Filhos) (>4 dígitos) -> Filhos (SE2010)
    const hierarchicalExpensesData = useMemo(() => {
        if (!expensesWithCountData) {
            return [];
        }

        // Helper function para garantir que o valor seja uma string segura
        const safeString = (value: any): string => {
            if (value === null || value === undefined) {
                return '';
            }
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value === 'object') {
                // Se for um objeto, tentar converter para string
                try {
                    return String(value);
                } catch {
                    return '';
                }
            }
            return String(value);
        };

        // Usar a nova estrutura expenses_by_child_nature se disponível
        const expensesByChildNature = expensesWithCountData.expenses_by_child_nature || {};
        const childNatureToDescri = expensesWithCountData.child_nature_to_descri || {};
        
        // Fallback para estrutura legada se nova não estiver disponível
        const expensesBySubrub = expensesWithCountData.expenses_by_subrub || {};
        const countBySubrub = expensesWithCountData.count_by_subrub || {};
        const historBySubrub = expensesWithCountData.histor_by_subrub || {};
        const dataBySubrub = expensesWithCountData.data_by_subrub || {};
        const categoryBySubrub = expensesWithCountData.category_by_subrub || {};

        const items: Array<{
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
        }> = [];

        // Se temos a nova estrutura, usar ela
        if (Object.keys(expensesByChildNature).length > 0) {
            // Primeiro, agrupar child_nature por mãe (primeiros 4 dígitos)
            const mothersMap: Record<string, {
                motherId: string; // 4 dígitos
                motherName: string;
                children: Array<{
                    childNature: string;
                    childData: any;
                }>;
            }> = {};
            
            // Mapear PAD_DESCRI das mães de 4 dígitos
            const motherNamesMap: Record<string, string> = {};
            movements.forEach((mov: any) => {
                const nature = String(mov.PAD_NATURE || '').trim();
                if (nature.length === 4 && nature !== '0001') {
                    motherNamesMap[nature] = mov.PAD_DESCRI || `Item ${nature}`;
                }
            });
            
            // Agrupar child_nature por mãe
            Object.entries(expensesByChildNature).forEach(([childNature, childData]: [string, any]) => {
                // Filtrar apenas child_nature com count > 0
                if (!childData || childData.count === 0) {
                    return;
                }
                
                // Pegar os primeiros 4 dígitos como mãe
                const motherId = childNature.substring(0, 4);
                
                if (!mothersMap[motherId]) {
                    mothersMap[motherId] = {
                        motherId,
                        motherName: motherNamesMap[motherId] || `Item ${motherId}`,
                        children: []
                    };
                }
                
                mothersMap[motherId].children.push({
                    childNature,
                    childData
                });
            });
            
            // Agora criar a estrutura hierárquica de 3 níveis
            Object.values(mothersMap).forEach(({ motherId, motherName, children }) => {
                // Coletar todas as datas da mãe
                const allMotherDates = new Set<string>();
                let motherTotal = 0;
                let motherCount = 0;
                
                // Adicionar mãe (nível 0)
                items.push({
                    id: motherId,
                    name: motherName,
                    value: 0, // Será calculado depois
                    count: 0, // Será calculado depois
                    isMother: true,
                    level: 0,
                    dates: [],
                    category: 'Outros',
                });
                
                // Para cada child_nature (nível 1 - Mãe dos Filhos)
                children.forEach(({ childNature, childData }) => {
                    const childMotherId = childNature;
                    const childMotherName = childData.descri || childNatureToDescri[childNature] || `Item ${childNature}`;
                    const pacRecords = childData.pac_records || [];
                    
                    // Coletar datas e calcular totais dos filhos SE2010
                    const pacChildrenItems: Array<{
                        id: string;
                        name: string;
                        value: number;
                        count: number;
                        isMother: boolean;
                        motherId?: string;
                        level: number;
                        dates?: string[];
                        category?: string;
                    }> = [];
                    
                    pacRecords.forEach((pacRecord: any, index: number) => {
                        // Contar registros válidos (SE2010 não tem campo DEBCRD, então contamos todos)
                        if (pacRecord.debcrd !== '2') {
                            return;
                        }

                        const pacChildId = `${childMotherId}-${pacRecord.subrub}-${index}`;
                        // Para netos (nível 2), usar E2_NOMEFOR diretamente
                        // Se não tiver E2_NOMEFOR, usar histor como fallback
                        let pacChildName = pacRecord.nomefor || pacRecord.histor || '';
                        
                        // Se ainda estiver vazio ou for apenas código numérico, buscar descrição do PAD_NATURE
                        if (!pacChildName || pacChildName.trim() === '' || /^\d+$/.test(pacChildName.trim())) {
                            // Buscar descrição do PAD_NATURE que termina com esses dígitos
                            const matchingNature = movements.find((mov: any) => {
                                const nature = String(mov.PAD_NATURE || '').trim();
                                // Verificar se termina com o código ou se o código é igual à natureza
                                return nature === pacChildName.trim() || 
                                       nature.endsWith(pacChildName.trim()) ||
                                       (nature.length >= 3 && nature.slice(-3) === pacChildName.trim().slice(-3));
                            });
                            if (matchingNature?.PAD_DESCRI) {
                                pacChildName = matchingNature.PAD_DESCRI;
                            } else {
                                // Se não encontrou, usar childData.descri ou childMotherName
                                pacChildName = childData.descri || childMotherName || `Item ${pacRecord.subrub}`;
                            }
                        }
                        const pacChildDates = pacRecord.data ? [pacRecord.data] : [];
                        
                        if (pacRecord.data && pacRecord.data.length >= 8) {
                            allMotherDates.add(pacRecord.data);
                        }
                        
                        // Determinar categoria
                        const historUpper = safeString(pacRecord.histor).toUpperCase();
                        let pacChildCategory = 'Outros';
                        
                        if (historUpper.includes('BOLSA ENSINO') || historUpper.includes('BOLSA/ENSINO')) {
                            pacChildCategory = 'Bolsa Ensino';
                        } else if (historUpper.includes('INTERPRETE') || historUpper.includes('INTÉRPRETE')) {
                            pacChildCategory = 'Bolsa Ensino';
                        } else if (historUpper.includes('BOLSA/COORDENAÇÃO') || historUpper.includes('BOLSA COORDENAÇÃO') || historUpper.includes('BOLSA/COORDENACAO')) {
                            pacChildCategory = 'Bolsa/Coordenação';
                        } else if (historUpper.includes('BOLSA')) {
                            pacChildCategory = 'Bolsas';
                        } else if (historUpper.includes('ATIVIDADE')) {
                            pacChildCategory = 'Atividade';
                        }

                        pacChildrenItems.push({
                            id: pacChildId,
                            name: pacChildName,
                            value: pacRecord.valor || 0,
                            count: 1,
                            isMother: false,
                            motherId: childMotherId,
                            level: 2, // Nível 2: Filhos dos filhos (SE2010)
                            dates: pacChildDates,
                            category: pacChildCategory,
                            emissao: pacRecord.emissao || '', // E2_EMISSAO - data de emissão
                            baixa: pacRecord.baixa || '', // E2_BAIXA - data de baixa
                        });
                    });
                    
                    // Calcular total do child_nature (soma dos SE2010)
                    const childMotherTotal = pacChildrenItems.reduce((sum, child) => sum + child.value, 0);
                    const childMotherCount = pacChildrenItems.length;
                    
                    // Determinar categoria do child_nature
                    const firstRecord = pacRecords[0];
                    let childMotherCategory = 'Outros';
                    if (firstRecord) {
                        const histor = safeString(firstRecord.histor).toUpperCase();
                        const descri = safeString(childData.descri).toUpperCase();
                        
                        if (histor.includes('BOLSA ENSINO') || histor.includes('BOLSA/ENSINO') || descri.includes('BOLSA ENSINO')) {
                            childMotherCategory = 'Bolsa Ensino';
                        } else if (histor.includes('INTERPRETE') || histor.includes('INTÉRPRETE')) {
                            childMotherCategory = 'Bolsa Ensino';
                        } else if (histor.includes('BOLSA/COORDENAÇÃO') || histor.includes('BOLSA COORDENAÇÃO') || histor.includes('BOLSA/COORDENACAO')) {
                            childMotherCategory = 'Bolsa/Coordenação';
                        } else if (histor.includes('BOLSA') || descri.includes('BOLSA')) {
                            childMotherCategory = 'Bolsas';
                        } else if (histor.includes('ATIVIDADE') || descri.includes('ATIVIDADE')) {
                            childMotherCategory = 'Atividade';
                        }
                    }
                    
                    const childMotherDates = Array.from(allMotherDates).sort();
                    
                    // Adicionar child_nature como mãe dos filhos (nível 1)
                    items.push({
                        id: childMotherId,
                        name: childMotherName,
                        value: childMotherTotal,
                        count: childMotherCount,
                        isMother: true,
                        motherId: motherId, // Mãe é a de 4 dígitos
                        level: 1, // Nível 1: Mãe dos Filhos (child_nature > 4 dígitos)
                        dates: childMotherDates,
                        category: childMotherCategory,
                    });
                    
                    // Adicionar filhos SE2010 (nível 2)
                    items.push(...pacChildrenItems);
                    
                    // Acumular para a mãe de 4 dígitos
                    motherTotal += childMotherTotal;
                    motherCount += childMotherCount;
                });
                
                // Atualizar valores da mãe de 4 dígitos
                const motherItem = items.find(item => item.id === motherId && item.level === 0);
                if (motherItem) {
                    motherItem.value = motherTotal;
                    motherItem.count = motherCount;
                    motherItem.dates = Array.from(allMotherDates).sort();
                }
            });
        } else {
            // Fallback para estrutura legada (compatibilidade)
            Object.entries(expensesBySubrub).forEach(([subrub, value]) => {
                const count = countBySubrub[subrub] || 0;
                
                if (count === 0) {
                    return;
                }
                
                let histor = historBySubrub[subrub] || '';
                // Verificar se histor é apenas um código numérico (ex: "0060", "060")
                if (histor && /^\d+$/.test(histor.trim())) {
                    // Buscar descrição do PAD_NATURE que corresponde a este subrub
                    // Primeiro tentar encontrar por últimos 3 dígitos
                    const matchingMovement = movements.find((mov: any) => {
                        const nature = String(mov.PAD_NATURE || '').trim();
                        // Verificar se termina com subrub ou se subrub corresponde aos últimos dígitos
                        if (nature.length >= 3) {
                            const last3 = nature.slice(-3);
                            return last3 === subrub || nature === histor.trim();
                        }
                        return false;
                    });
                    if (matchingMovement?.PAD_DESCRI) {
                        histor = matchingMovement.PAD_DESCRI;
                    } else {
                        // Tentar encontrar mãe de 4 dígitos que termina com os últimos 3 dígitos do subrub
                        const motherMatch = mothers.find((mov: any) => {
                            const nature = String(mov.PAD_NATURE || '').trim();
                            if (nature.length >= 3) {
                                const last3 = nature.slice(-3);
                                return last3 === subrub;
                            }
                            return false;
                        });
                        if (motherMatch?.PAD_DESCRI) {
                            histor = motherMatch.PAD_DESCRI;
                        } else {
                            histor = `Item ${subrub}`;
                        }
                    }
                } else if (!histor || histor.trim() === '') {
                    histor = `Item ${subrub}`;
                }
                const dates = dataBySubrub[subrub] || [];
                const category = categoryBySubrub[subrub] || 'Outros';
                
                // Tentar encontrar movimento filho correspondente
                const matchingChild = movements.find((mov: any) => {
                    const nature = String(mov.PAD_NATURE || '').trim();
                    return nature.length > 4 && subrub.startsWith(nature);
                });
                
                if (matchingChild) {
                    const motherId = String(matchingChild.PAD_NATURE || '').trim();
                    const motherName = matchingChild.PAD_DESCRI || histor;
                    
                    // Verificar se mãe já foi adicionada
                    if (!items.find(item => item.id === motherId && item.isMother)) {
                        items.push({
                            id: motherId,
                            name: motherName,
                            value: 0,
                            count: 0,
                            isMother: true,
                            level: 0,
                            dates: [],
                            category: category,
                        });
                    }
                    
                    // Adicionar como filho
                    items.push({
                        id: `${motherId}-${subrub}`,
                        name: histor,
                        value: value as number,
                        count: count,
                        isMother: false,
                        motherId: motherId,
                        level: 1,
                        dates: dates,
                        category: category,
                    });
                    
                    // Atualizar total da mãe
                    const motherItem = items.find(item => item.id === motherId && item.isMother);
                    if (motherItem) {
                        motherItem.value += value as number;
                        motherItem.count += count;
                        if (dates.length > 0) {
                            motherItem.dates = Array.from(new Set([...motherItem.dates, ...dates])).sort();
                        }
                    }
                } else {
                    // Standalone item
                    items.push({
                        id: subrub,
                        name: histor,
                        value: value as number,
                        count: count,
                        isMother: true,
                        level: 0,
                        dates: dates,
                        category: category,
                    });
                }
            });
        }

        return items;
    }, [expensesWithCountData, movements]);

    // Create mapping of PAC values by PAD_NATURE
    const pacValuesByNature = useMemo(() => {
        const mapping: Record<string, number> = {};
        
        if (!expensesWithCountData) {
            return mapping;
        }
        
        const expensesByChildNature = expensesWithCountData.expenses_by_child_nature || {};
        
        // Para cada child_nature (filho do PAD010 > 4 dígitos), já temos o total do PAC
        Object.entries(expensesByChildNature).forEach(([childNature, childData]: [string, any]) => {
            if (childData && childData.total) {
                mapping[childNature] = childData.total || 0;
                
                // Para mães de 4 dígitos, precisamos somar os filhos que começam com esse código
                const motherNature = childNature.substring(0, 4);
                if (!mapping[motherNature]) {
                    mapping[motherNature] = 0;
                }
                mapping[motherNature] += childData.total || 0;
            }
        });
        
        return mapping;
    }, [expensesWithCountData]);

    // Filtered and sorted mothers
    const filteredMovements = useMemo(() => {
        let filtered = mothers.filter((mov: any) => {
            // Search filter
            const matchesSearch = !searchTerm || 
                (mov.PAD_DESCRI && mov.PAD_DESCRI.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // Description filter
            const matchesDescri = descriFilter === 'all' || mov.PAD_DESCRI === descriFilter;
            
            return matchesSearch && matchesDescri;
        });

        // Sorting
        filtered.sort((a: any, b: any) => {
            let aVal: any, bVal: any;
            
            switch (sortField) {
                case 'descri':
                    aVal = a.PAD_DESCRI || '';
                    bVal = b.PAD_DESCRI || '';
                    break;
                case 'value':
                    // Calculate total using PAC values instead of PAD values
                    const aNature = String(a.PAD_NATURE || '').trim();
                    const aPacValue = pacValuesByNature[aNature] || 0;
                    
                    const bNature = String(b.PAD_NATURE || '').trim();
                    const bPacValue = pacValuesByNature[bNature] || 0;
                    
                    aVal = aPacValue;
                    bVal = bPacValue;
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [mothers, pacValuesByNature, searchTerm, descriFilter, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const paginatedMovements = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMovements.slice(start, start + itemsPerPage);
    }, [filteredMovements, currentPage, itemsPerPage]);

    // Statistics (including children)
    // Total Geral sempre usa o total completo, não os movimentos filtrados
    const stats = useMemo(() => {
        // Total Geral sempre usa o total completo de expensesWithCountData (sem filtros)
        const totalGeral = totalGeralData?.total || expensesByMonthData?.total || 0;
        
        if (!filteredMovements || filteredMovements.length === 0) {
            return {
                total: totalGeral,
                count: 0,
                average: 0,
                max: 0,
                min: 0,
            };
        }

        // Para outras estatísticas, usar os movimentos filtrados
        const values = filteredMovements.map((m: any) => {
            const nature = String(m.PAD_NATURE || '').trim();
            return pacValuesByNature[nature] || 0;
        });
        const max = Math.max(...values);
        const min = Math.min(...values);
        const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

        return {
            total: totalGeral, // Sempre o total completo, não muda com filtros
            count: filteredMovements.length,
            average,
            max,
            min,
        };
    }, [filteredMovements, pacValuesByNature, totalGeralData?.total, expensesByMonthData?.total]);

    // Calculate period total based on selected months
    // Se há meses selecionados, usar expensesWithCountData?.total que já foi filtrado pelos meses
    // Se não há meses selecionados, mostrar total completo
    const periodTotal = useMemo(() => {
        if (selectedMonths.size === 0) {
            // No period selected - show total from all expenses
            // Usar expensesWithCountData?.total que tem todos os dados sem filtro
            return expensesWithCountData?.total || expensesByMonthData?.total || 0;
        }
        
        // Se há meses selecionados, usar expensesWithCountData?.total que já foi filtrado pelos meses
        // O endpoint expenses-with-count já aplica filtros de data quando selectedMonths existe
        if (expensesWithCountData?.total !== undefined) {
            return expensesWithCountData.total;
        }
        
        // Fallback: calcular da soma de expensesByMonth filtrado
        return Object.entries(expensesByMonth)
            .filter(([month]) => selectedMonths.has(month))
            .reduce((sum, [, value]) => sum + value, 0);
    }, [selectedMonths, expensesByMonth, expensesWithCountData?.total, expensesByMonthData?.total]);

    const handleSort = (field: 'descri' | 'value') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: 'descri' | 'value' }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="h-3 w-3 ml-1" />
            : <ArrowDown className="h-3 w-3 ml-1" />;
    };

    const toggleRow = (idx: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idx)) {
                newSet.delete(idx);
            } else {
                newSet.add(idx);
            }
            return newSet;
        });
    };

    return (
        <Card className="relative">
            {/* Progress bar for loading */}
            {isLoading && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden rounded-t-lg">
                    <div 
                        className="h-full bg-blue-500 animate-[progress_1s_ease-in-out_infinite]" 
                        style={{ width: '30%' }} 
                    />
                </div>
            )}
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Movimentações Financeiras</CardTitle>
                        <CardDescription>
                            Gestão completa dos lançamentos registrados no projeto
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm">
                            {filteredMovements.length} {filteredMovements.length === 1 ? 'registro' : 'registros'}
                        </Badge>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.location.reload()}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                        <ExportHierarchicalButton
                            data={filteredMovements.map((mov: any) => ({
                                id: String(mov.PAD_NATURE || '').trim(),
                                name: mov.PAD_DESCRI || '',
                                value: pacValuesByNature[String(mov.PAD_NATURE || '').trim()] || 0,
                                count: 0,
                                isMother: true,
                                level: 0,
                                dates: [],
                                category: ''
                            }))}
                            childrenByMother={Object.fromEntries(
                                Object.entries(childrenByMother).map(([key, children]) => [
                                    key,
                                    children.map((child: any) => ({
                                        id: String(child.PAD_NATURE || '').trim(),
                                        name: child.PAD_DESCRI || '',
                                        value: pacValuesByNature[String(child.PAD_NATURE || '').trim()] || 0,
                                        count: 0,
                                        isMother: false,
                                        motherId: key,
                                        level: 1,
                                        dates: [],
                                        category: ''
                                    }))
                                ])
                            )}
                            grandchildrenByChild={{}}
                            projectName={projectName}
                            projectCode={projectCode}
                            type="movimentacoes"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Filters - Horizontal Layout */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10"
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                onClick={() => setSearchTerm('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <Select value={descriFilter} onValueChange={setDescriFilter}>
                        <SelectTrigger className="w-[200px] bg-white/5 border-white/10">
                            <SelectValue placeholder="Todas categorias" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas categorias</SelectItem>
                            {uniqueDescriptions.map((descri) => (
                                <SelectItem key={descri} value={descri}>
                                    {descri}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Always show period filter, even if no data - show loading or empty state */}
                    {isLoadingExpensesByMonth ? (
                        <Button
                            variant="outline"
                            disabled
                            className="w-full sm:w-[280px] justify-between bg-white/5 border-white/10"
                        >
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="truncate">Carregando períodos...</span>
                            </div>
                        </Button>
                    ) : errorExpensesByMonth ? (
                        <Button
                            variant="outline"
                            disabled
                            className="w-full sm:w-[280px] justify-between bg-white/5 border-white/10"
                        >
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="truncate">Erro ao carregar períodos</span>
                            </div>
                        </Button>
                    ) : (
                        <PeriodFilterDropdown
                            months={availableMonths}
                            selectedMonths={selectedMonths}
                            onSelectionChange={setSelectedMonths}
                        />
                    )}
                    {hasActiveFilters && (
                        <Badge variant="secondary" className="gap-1">
                            {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro' : 'filtros'}
                            <X className="h-3 w-3 cursor-pointer" onClick={clearAllFilters} />
                        </Badge>
                    )}
                </div>

                {/* Hero Metrics */}
                {filteredMovements.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass-card rounded-xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-blue-500/30">
                                    <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Geral</p>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                        {formatCurrency(stats.total)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card rounded-xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-cyan-500/30">
                                    <CalendarRange className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                                            Total no Período
                                        </p>
                                        {selectedMonths.size > 0 && (() => {
                                            const isAllSelected = selectedMonths.size === availableMonths.length && availableMonths.length > 0;
                                            
                                            if (isAllSelected) {
                                                return (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full">
                                                        Todos os períodos
                                                    </span>
                                                );
                                            }
                                            
                                            const monthsArray = Array.from(selectedMonths).sort();
                                            return (
                                                <div className="flex flex-wrap gap-1">
                                                    {monthsArray.map((month) => {
                                                        const monthFull = formatMonthFull(month);
                                                        return (
                                                            <span 
                                                                key={month}
                                                                className="px-2 py-0.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full"
                                                            >
                                                                {monthFull}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <p className="text-3xl font-bold text-cyan-700 dark:text-cyan-400">
                                        {formatCurrency(periodTotal)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Secondary Metrics */}
                {filteredMovements.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Maior Gasto</div>
                            <div className={cn("text-sm font-semibold", getValueColor(stats.max))}>
                                {formatCurrency(stats.max)}
                            </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">Menor Gasto</div>
                            <div className={cn("text-sm font-semibold", getValueColor(stats.min))}>
                                {formatCurrency(stats.min)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Chart and Table Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_2fr] gap-4">
                    {/* Monthly Expenses Chart Section */}
                    <div className="space-y-4">
                        {isLoadingExpensesByMonth ? (
                            <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg border border-dashed">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                    <div className="text-sm text-muted-foreground">Carregando gastos mensais...</div>
                                </div>
                            </div>
                        ) : errorExpensesByMonth ? (
                            <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg border border-dashed border-destructive/50">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-sm font-medium text-destructive">Erro ao carregar gastos mensais</div>
                                    <div className="text-xs text-muted-foreground">
                                        {errorExpensesByMonth instanceof Error 
                                            ? errorExpensesByMonth.message 
                                            : 'Ocorreu um erro ao buscar os dados. Tente recarregar a página.'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <MonthlyExpensesChart
                                data={Object.entries(expensesByMonth).map(([month, value]) => ({
                                    month,
                                    value,
                                }))}
                                total={expensesByMonthData?.total}
                                onMonthClick={handleMonthClick}
                            />
                        )}
                    </div>

                    {/* Tabela de Movimentações */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                                <Table2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-foreground">
                                    Tabela de Movimentações
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Visualize e gerencie todas as movimentações financeiras do projeto
                                </p>
                            </div>
                        </div>
                        <div className="rounded-md border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>
                                    <button
                                        onClick={() => handleSort('descri')}
                                        className="flex items-center hover:text-foreground transition-colors"
                                    >
                                        Descrição
                                        <SortIcon field="descri" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px] text-right">
                                    <button
                                        onClick={() => handleSort('value')}
                                        className="flex items-center justify-end ml-auto hover:text-foreground transition-colors"
                                    >
                                        Total
                                        <SortIcon field="value" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px] text-right">
                                    {selectedMonths.size > 0 ? 'Gasto no Período' : 'Gasto Total'}
                                </TableHead>
                                <TableHead className="w-[100px] text-center">
                                    Subitens
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <div className="flex justify-center gap-2 text-muted-foreground">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            Carregando...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={selectedMonths.size > 0 ? 5 : 4} className="text-center py-8 text-destructive">
                                        Erro ao carregar movimentações. Tente novamente.
                                    </TableCell>
                                </TableRow>
                            ) : paginatedMovements && paginatedMovements.length > 0 ? (
                                paginatedMovements.map((mov: any, idx: number) => {
                                    const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                                    const isExpanded = expandedRows.has(globalIdx);
                                    const rowKey = mov.R_E_C_N_O_ || `mov-${globalIdx}`;
                                    const motherNature = String(mov.PAD_NATURE || '').trim();
                                    const children = (childrenByMother[motherNature] || []).filter(Boolean);
                                    
                                    // Calculate total using PAC values
                                    // For mothers: use PAC value which is sum of all children
                                    const totalValue = pacValuesByNature[motherNature] || 0;
                                    
                                    // Get expenses for this nature in the period
                                    // For mothers: use the last 3 digits of the 4-digit nature
                                    // For children: use the last 3 digits of their nature
                                    const periodExpense = getExpenseForNature(motherNature);
                                    const childrenPeriodExpense = children.reduce((sum: number, child: any) => 
                                        sum + getExpenseForNature(String(child.PAD_NATURE || '').trim()), 0);
                                    // Total period expense includes both mother and children
                                    const totalPeriodExpense = periodExpense + childrenPeriodExpense;
                                    
                                    return (
                                        <React.Fragment key={rowKey}>
                                            <TableRow
                                                className={cn(
                                                    "transition-colors cursor-pointer",
                                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/30",
                                                    "hover:bg-blue-500/5"
                                                )}
                                                onClick={() => toggleRow(globalIdx)}
                                            >
                                                <TableCell>
                                                    {children.length > 0 ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleRow(globalIdx);
                                                            }}
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <div className="w-4 h-4" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-8 rounded-full bg-emerald-500/50" />
                                                        <div className="text-sm truncate max-w-[300px]" title={mov.PAD_DESCRI}>
                                                            {mov.PAD_DESCRI || '-'}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className={cn("text-sm font-semibold", getValueColor(totalValue))}>
                                                        {formatCurrency(totalValue)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className={cn(
                                                        "text-sm font-semibold",
                                                        totalPeriodExpense > 0 ? "text-blue-600" : "text-muted-foreground"
                                                    )}>
                                                        {totalPeriodExpense > 0 ? formatCurrency(totalPeriodExpense) : '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {children.length > 0 ? (
                                                        <Badge variant="outline" className="text-xs">
                                                            {children.length}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && children.length > 0 && (
                                                <TableRow key={`${rowKey}-expanded`}>
                                                    <TableCell colSpan={5} className="p-0">
                                                        <div className="bg-muted/20 p-4 border-l-2 border-blue-500/50 ml-4">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="text-xs">
                                                                        <TableHead>Descrição</TableHead>
                                                                        <TableHead className="text-right">Natureza</TableHead>
                                                                        <TableHead className="text-right">Valor</TableHead>
                                                                        <TableHead className="text-right">
                                                                            {selectedMonths.size > 0 ? 'Gasto no Período' : 'Gasto Total'}
                                                                        </TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {children.map((child: any, childIdx: number) => {
                                                                        const childNature = String(child.PAD_NATURE || '').trim();
                                                                        const childValue = pacValuesByNature[childNature] || 0;
                                                                        const childPeriodExpense = getExpenseForNature(childNature);
                                                                        return (
                                                                            <TableRow
                                                                                key={child.R_E_C_N_O_ || `child-${childIdx}`}
                                                                                className={childIdx % 2 === 0 ? "" : "bg-muted/20"}
                                                                            >
                                                                                <TableCell className="text-sm">
                                                                                    {child.PAD_DESCRI || '-'}
                                                                                </TableCell>
                                                                                <TableCell className="text-right text-xs text-muted-foreground">
                                                                                    {child.PAD_NATURE}
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    <span className={cn("text-sm font-semibold", getValueColor(childValue))}>
                                                                                        {formatCurrency(childValue)}
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    {childPeriodExpense > 0 ? (
                                                                                        <span className="text-sm font-semibold text-blue-600">
                                                                                            {formatCurrency(childPeriodExpense)}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-xs text-muted-foreground">-</span>
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={selectedMonths.size > 0 ? 5 : 4} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                <Calendar className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Nenhuma movimentação encontrada</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {searchTerm || descriFilter !== 'all'
                                                        ? 'Tente ajustar os filtros aplicados'
                                                        : 'Este projeto ainda não possui lançamentos financeiros'}
                                                </p>
                                            </div>
                                            {(searchTerm || descriFilter !== 'all') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSearchTerm('');
                                                        setDescriFilter('all');
                                                    }}
                                                >
                                                    Limpar Filtros
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {filteredMovements.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <Pagination
                                    page={currentPage}
                                    totalPages={totalPages}
                                    totalItems={filteredMovements.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={(newItemsPerPage) => {
                                        setItemsPerPage(newItemsPerPage);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Expenses by Item Chart - Always visible */}
                <ExpensesByItemHierarchicalChart
                    data={hierarchicalExpensesData}
                    total={expensesWithCountData?.total || 0}
                    totalTransactions={expensesWithCountData?.total_transactions || 0}
                    availableMonths={expensesWithCountData?.available_months || []}
                    dataBySubrub={expensesWithCountData?.data_by_subrub || {}}
                    categoryBySubrub={expensesWithCountData?.category_by_subrub || {}}
                    projectName={projectName}
                    projectCode={projectCode}
                />

                {/* Mobile FAB for Filters */}
                <div className="fixed bottom-4 right-4 md:hidden z-50">
                    <Button
                        size="lg"
                        className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700"
                        onClick={() => setShowMobileFilters(true)}
                    >
                        <Filter className="h-6 w-6" />
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                </div>

                {/* Mobile Filters Dialog */}
                {showMobileFilters && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
                        <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-lg p-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Filtros</h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar descrição..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={descriFilter} onValueChange={setDescriFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas categorias" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas categorias</SelectItem>
                                        {uniqueDescriptions.map((descri) => (
                                            <SelectItem key={descri} value={descri}>
                                                {descri}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {/* Always show period filter in mobile too */}
                                {isLoadingExpensesByMonth ? (
                                    <Button
                                        variant="outline"
                                        disabled
                                        className="w-full justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span className="truncate">Carregando períodos...</span>
                                        </div>
                                    </Button>
                                ) : errorExpensesByMonth ? (
                                    <Button
                                        variant="outline"
                                        disabled
                                        className="w-full justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span className="truncate">Erro ao carregar períodos</span>
                                        </div>
                                    </Button>
                                ) : (
                                    <PeriodFilterDropdown
                                        months={availableMonths}
                                        selectedMonths={selectedMonths}
                                        onSelectionChange={setSelectedMonths}
                                    />
                                )}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        clearAllFilters();
                                        setShowMobileFilters(false);
                                    }}
                                >
                                    Limpar Filtros
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

