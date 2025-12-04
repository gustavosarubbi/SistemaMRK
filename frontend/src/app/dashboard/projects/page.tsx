'use client';

import * as React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { Project, PaginatedResponse, AdvancedProjectFilters, SavedFilter, ViewMode, FilterPreset } from '@/types';
import { AlertCircle, FileText, Filter, PanelLeftClose, PanelLeft } from 'lucide-react';

// Project components
import { ProjectStatsCards } from '@/components/dashboard/project-stats-cards';
import { FiltersSidebar } from '@/components/projects/filters-sidebar';
import { TableToolbar } from '@/components/projects/table-toolbar';
import { projectColumns, compactColumns, getRowUrgencyClass } from '@/components/projects/columns';
import { ProjectsGrid } from '@/components/projects/projects-grid';
import { BulkActionsBar } from '@/components/projects/bulk-actions-bar';
import { ComparisonModal } from '@/components/projects/comparison-modal';
import { SaveFilterModal } from '@/components/projects/save-filter-modal';
import { UrgencyCards } from '@/components/projects/urgency-cards';
import { QuickFilterChips } from '@/components/projects/quick-filter-chips';

// Store and utilities
import { useProjectPreferencesStore } from '@/store/projectPreferencesStore';
import { exportProjects, ExportFormat } from '@/lib/export-utils';
import { useDebouncedCallback } from 'use-debounce';
import { useFilterCounts, useUrgencyCounts } from '@/hooks/useFilterCounts';
import { 
    filterByVigenciaDaysRange,
    filterByRenderingDaysRange,
    filterByExecutionRange,
    isProjectCritical,
    needsUrgentAttention,
    getDaysRemaining,
    getDaysSinceEnd,
    isRenderingAccountsUrgent,
} from '@/lib/date-utils';
import { getProjectClassification, getServiceType } from '@/lib/project-mappings';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
    const searchParams = useSearchParams();
    
    // Preferences from store
    const {
        visibleColumns,
        viewMode,
        itemsPerPage,
        savedFilters,
        setVisibleColumns,
        setViewMode,
        setItemsPerPage,
        addSavedFilter,
        removeSavedFilter,
        toggleColumn,
    } = useProjectPreferencesStore();

    // Initialize filters from URL params
    const getInitialFilters = useCallback((): AdvancedProjectFilters => {
        const status = searchParams.get('status') || '';
        const sort = searchParams.get('sort') || '';
        const filter = searchParams.get('filter') || '';
        
        return {
            search: '',
            startDate: '2023-01-01',
            endDate: '',
            coordinator: '',
            client: '',
            status: status || '',
            showApprovedOnly: false,
            vigenciaDaysRange: 'all',
            renderingDaysRange: 'all',
            executionRange: 'all',
            classification: '',
            serviceType: '',
        };
    }, [searchParams]);

    // Local state for filters
    const [filters, setFilters] = useState<AdvancedProjectFilters>(getInitialFilters());
    
    // Apply URL params on mount
    useEffect(() => {
        const status = searchParams.get('status');
        const sort = searchParams.get('sort');
        const filter = searchParams.get('filter');
        
        if (status) {
            setFilters(prev => ({ ...prev, status }));
        }
        
        // Handle ending_soon filter
        if (filter === 'ending_soon' && status === 'in_execution') {
            setFilters(prev => ({ 
                ...prev, 
                status: 'in_execution',
                vigenciaDaysRange: '30days'
            }));
        }
    }, [searchParams]);
    
    const [page, setPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState<Project[]>([]);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [isSaveFilterOpen, setIsSaveFilterOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeUrgencyFilter, setActiveUrgencyFilter] = useState<string | undefined>();
    const [activePreset, setActivePreset] = useState<FilterPreset | undefined>();
    
    // Debounced search for API calls
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSetSearch = useDebouncedCallback((value: string) => {
        setDebouncedSearch(value);
        setPage(1);
    }, 300);
    
    // Fetch filter options (Coordinators and Clients)
    const { data: filterOptions } = useQuery({
        queryKey: ['project-options'],
        queryFn: async () => {
            const res = await api.get('/projects/options');
            return res.data;
        },
        refetchOnWindowFocus: false,
    });

    const coordinators = filterOptions?.coordinators || [];
    const clients = filterOptions?.units || [];

    // Fetch projects
    const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects', debouncedSearch, page, filters.startDate, filters.endDate, filters.coordinator, filters.client, filters.status, itemsPerPage],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            if (filters.coordinator) params.append('coordinator', filters.coordinator);
            if (filters.client) params.append('client', filters.client);
            if (filters.status && filters.status !== 'not_started') params.append('status', filters.status);
            
            params.append('page', page.toString());
            params.append('limit', itemsPerPage.toString());
            
            const res = await api.get(`/projects?${params.toString()}`);
            return res.data;
        },
        placeholderData: (previousData) => previousData,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const allProjects = data?.data || [];
    
    // Query separada para obter TODOS os projetos (sem paginação) para contadores de urgência
    // Usa status=all para pegar TODOS os projetos, não apenas os ativos
    const { data: allProjectsForCounts } = useQuery<PaginatedResponse<Project>>({
        queryKey: ['projects-counts', debouncedSearch, filters.startDate, filters.endDate, filters.coordinator, filters.client],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            if (filters.coordinator) params.append('coordinator', filters.coordinator);
            if (filters.client) params.append('client', filters.client);
            // Usar status=all para pegar TODOS os projetos (incluindo finalizados) para contadores
            params.append('status', 'all');
            // Não aplicar paginação - pegar todos
            params.append('page', '1');
            params.append('limit', '10000'); // Limite alto para pegar todos
            
            const res = await api.get(`/projects?${params.toString()}`);
            return res.data;
        },
        placeholderData: (previousData) => previousData,
        retry: 1,
        refetchOnWindowFocus: false,
    });
    
    // Projetos para contadores (todos, sem paginação, incluindo finalizados)
    const projectsForCounts = allProjectsForCounts?.data || [];
    
    // Apply client-side filters
    const filteredProjects = useMemo(() => {
        let result = allProjects;
        
        // Filter by approved only
        if (filters.showApprovedOnly) {
            result = result.filter(p => {
                const hasBudget = (p.budget || 0) > 0;
                const isNotBlocked = p.CTT_BLOQ !== 'S' && p.CTT_BLOQ !== '1';
                return hasBudget && isNotBlocked;
            });
        }
        
        // Filter by classification
        if (filters.classification) {
            result = result.filter(p => {
                const classification = getProjectClassification(p.CTT_CLAPRJ);
                return classification === filters.classification;
            });
        }
        
        // Filter by service type
        if (filters.serviceType) {
            result = result.filter(p => {
                const serviceType = getServiceType(p.CTT_TPCONV);
                return serviceType === filters.serviceType;
            });
        }
        
        // Filter by vigência days remaining
        if (filters.vigenciaDaysRange && filters.vigenciaDaysRange !== 'all') {
            result = filterByVigenciaDaysRange(
                result, 
                filters.vigenciaDaysRange,
                filters.vigenciaDaysMin,
                filters.vigenciaDaysMax
            );
        }
        
        // Filter by rendering days remaining
        if (filters.renderingDaysRange && filters.renderingDaysRange !== 'all') {
            result = filterByRenderingDaysRange(
                result,
                filters.renderingDaysRange,
                filters.renderingDaysMin,
                filters.renderingDaysMax
            );
        }
        
        // Filter by execution range
        if (filters.executionRange && filters.executionRange !== 'all') {
            result = filterByExecutionRange(
                result,
                filters.executionRange,
                filters.executionMin,
                filters.executionMax
            );
        }
        
        // Filter by urgency card
        if (activeUrgencyFilter) {
            result = result.filter(project => {
                const days = getDaysRemaining(project.CTT_DTFIM);
                const daysSinceEnd = getDaysSinceEnd(project.CTT_DTFIM);
                switch (activeUrgencyFilter) {
                    case 'today':
                        return days === 0;
                    case 'week':
                        return days !== null && days > 0 && days <= 7;
                    case 'critical':
                        return isProjectCritical(project);
                    case 'rendering_urgent':
                        // Prestação de contas urgente (≤15 dias restantes)
                        return isRenderingAccountsUrgent(project.CTT_DTFIM);
                    case 'rendering':
                        return filters.status === 'rendering_accounts';
                    default:
                        return true;
                }
            });
        }
        
        // Filter by preset
        if (activePreset && activePreset !== 'all') {
            result = result.filter(project => {
                const days = getDaysRemaining(project.CTT_DTFIM);
                const daysSinceEnd = getDaysSinceEnd(project.CTT_DTFIM);
                const usage = project.usage_percent || 0;
                
                switch (activePreset) {
                    case 'critical':
                        return isProjectCritical(project);
                    case 'urgent_attention':
                        return needsUrgentAttention(project);
                    case 'ending_soon':
                        return days !== null && days >= 0 && days <= 30;
                    case 'render_accounts':
                        return filters.status === 'rendering_accounts';
                    case 'rendering_urgent':
                        return isRenderingAccountsUrgent(project.CTT_DTFIM);
                    default:
                        return true;
                }
            });
        }
        
        return result;
    }, [allProjects, filters, activeUrgencyFilter, activePreset]);
    
    const totalPages = data?.total_pages || 1;
    const totalItems = data?.total || 0;

    // Calculate counts usando TODOS os projetos (sem paginação)
    const filterCounts = useFilterCounts(projectsForCounts);
    const urgencyCountsRaw = useUrgencyCounts(projectsForCounts);
    
    // Usar stats do backend para garantir consistência com os cards de baixo
    // Mas manter os contadores de urgência específicos do frontend
    const urgencyCounts = {
        ...urgencyCountsRaw,
        // Usar stats do backend para renderingAccounts para garantir consistência
        renderingAccounts: data?.stats?.rendering_accounts || urgencyCountsRaw.renderingAccounts,
    };

    // Memoized columns based on view mode
    const columns = useMemo(() => {
        return viewMode === 'compact' ? compactColumns : projectColumns;
    }, [viewMode]);

    // Column visibility state for DataTable
    const columnVisibility = useMemo(() => {
        const visibility: Record<string, boolean> = {};
        columns.forEach(col => {
            const id = (col as { accessorKey?: string; id?: string }).accessorKey || (col as { id?: string }).id;
            if (id) {
                visibility[id] = visibleColumns.includes(id);
            }
        });
        return visibility;
    }, [columns, visibleColumns]);

    // Handlers
    const handleFiltersChange = useCallback((newFilters: Partial<AdvancedProjectFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        if ('search' in newFilters) {
            debouncedSetSearch(newFilters.search || '');
        }
        setPage(1);
        // Clear urgency filter when changing other filters
        if (!('status' in newFilters)) {
            setActiveUrgencyFilter(undefined);
        }
    }, [debouncedSetSearch]);

    const handleClearFilters = useCallback(() => {
        setFilters({
            search: '',
            startDate: '2023-01-01',
            endDate: '',
            coordinator: '',
            client: '',
            status: '',
            showApprovedOnly: false,
            vigenciaDaysRange: 'all',
            renderingDaysRange: 'all',
            executionRange: 'all',
            classification: '',
            serviceType: '',
        });
        setDebouncedSearch('');
        setActiveUrgencyFilter(undefined);
        setActivePreset(undefined);
        setPage(1);
    }, []);

    const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
        toggleColumn(columnId);
    }, [toggleColumn]);

    const handleExport = useCallback((format: ExportFormat, selectedOnly: boolean) => {
        const dataToExport = selectedOnly ? selectedRows : filteredProjects;
        const filename = `projetos-${new Date().toISOString().split('T')[0]}`;
        exportProjects(dataToExport, format, filename);
    }, [selectedRows, filteredProjects]);

    const handleSaveFilter = useCallback((name: string) => {
        const newFilter: SavedFilter = {
            id: `filter-${Date.now()}`,
            name,
            createdAt: new Date().toISOString(),
            filters: { ...filters, search: debouncedSearch },
        };
        addSavedFilter(newFilter);
    }, [filters, debouncedSearch, addSavedFilter]);

    const handleApplyFilter = useCallback((filter: SavedFilter) => {
        setFilters(filter.filters as AdvancedProjectFilters);
        if (filter.filters.search) {
            setDebouncedSearch(filter.filters.search);
        }
        setPage(1);
    }, []);

    const handleRowSelection = useCallback((rows: Project[]) => {
        setSelectedRows(rows);
    }, []);

    const handleGridSelect = useCallback((project: Project, selected: boolean) => {
        setSelectedRows(prev => {
            if (selected) {
                return [...prev, project];
            }
            return prev.filter(p => p.CTT_CUSTO !== project.CTT_CUSTO);
        });
    }, []);

    const handleStatusFilterClick = useCallback((status: string) => {
        setFilters(prev => ({ ...prev, status }));
        setPage(1);
    }, []);

    const handleUrgencyCardClick = useCallback((filter: string) => {
        if (activeUrgencyFilter === filter) {
            setActiveUrgencyFilter(undefined);
        } else {
            setActiveUrgencyFilter(filter);
            // Set status filter for rendering accounts
            if (filter === 'rendering') {
                setFilters(prev => ({ ...prev, status: 'rendering_accounts' }));
            }
        }
        setPage(1);
    }, [activeUrgencyFilter]);

    const handlePresetChange = useCallback((preset: FilterPreset | undefined) => {
        setActivePreset(preset);
        setActiveUrgencyFilter(undefined);
        if (preset === 'render_accounts') {
            setFilters(prev => ({ ...prev, status: 'rendering_accounts' }));
        }
        setPage(1);
    }, []);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <PageHeader
                    title="Projetos"
                    description="Gerencie e acompanhe o status financeiro dos projetos"
                    breadcrumbItems={[{ label: 'Projetos' }]}
                />
            </div>

            {/* Urgency Cards - Mini Dashboard */}
            <UrgencyCards
                counts={urgencyCounts}
                onCardClick={handleUrgencyCardClick}
                activeFilter={activeUrgencyFilter}
            />

            {/* Quick Filter Chips */}
            <QuickFilterChips
                activePreset={activePreset}
                onPresetChange={handlePresetChange}
                counts={{
                    critical: urgencyCounts.critical,
                    urgentWeek: urgencyCounts.urgentWeek,
                    renderingAccounts: urgencyCounts.renderingAccounts,
                    renderingUrgent: urgencyCounts.renderingUrgent,
                    highExecution: filterCounts.byExecution.high + filterCounts.byExecution.exceeded,
                }}
            />

            {/* Main Content with Sidebar */}
            <div className="flex gap-4">
                {/* Filters Sidebar */}
                    <FiltersSidebar
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        onClearFilters={handleClearFilters}
                        onSaveFilter={() => setIsSaveFilterOpen(true)}
                        counts={filterCounts}
                        coordinators={coordinators}
                        clients={clients}
                        isOpen={isSidebarOpen}
                        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                        projects={allProjects}
                    />

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-4">
                    {/* Toggle Sidebar Button (when closed) */}
                    {!isSidebarOpen && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSidebarOpen(true)}
                            className="gap-2"
                        >
                            <PanelLeft className="h-4 w-4" />
                            Filtros
                        </Button>
                    )}

                    {/* Stats Cards */}
                    <ProjectStatsCards 
                        stats={data?.stats} 
                        onFilterClick={handleStatusFilterClick}
                        currentFilter={filters.status}
                    />

                    {/* Toolbar */}
                    <TableToolbar
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        selectedCount={selectedRows.length}
                        totalCount={filteredProjects.length}
                        visibleColumns={visibleColumns}
                        onColumnVisibilityChange={handleColumnVisibilityChange}
                        onExport={handleExport}
                        onCompare={() => setIsCompareOpen(true)}
                    />

                    {/* Content */}
                    {viewMode === 'cards' ? (
                        <ProjectsGrid
                            projects={filteredProjects}
                            selectedIds={selectedRows.map(r => r.CTT_CUSTO)}
                            onSelect={handleGridSelect}
                            isLoading={isLoading}
                        />
                    ) : (
                        <Card className="overflow-hidden">
                            {error ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16">
                                    <AlertCircle className="h-8 w-8 text-destructive" />
                                    <div className="text-center">
                                        <p className="font-medium text-destructive">Erro ao carregar projetos</p>
                                        <p className="text-sm text-muted-foreground mt-1">Tente novamente em alguns instantes</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                                        Tentar novamente
                                    </Button>
                                </div>
                            ) : (
                                <DataTable
                                    columns={columns}
                                    data={filteredProjects}
                                    onRowSelectionChange={handleRowSelection}
                                    onRowClick={(project) => {
                                        window.location.href = `/dashboard/projects/${project.CTT_CUSTO}`
                                    }}
                                    columnVisibility={columnVisibility}
                                    isLoading={isLoading}
                                    emptyMessage={
                                        <div className="flex flex-col items-center justify-center gap-3 py-8">
                                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                                            <div className="text-center">
                                                <p className="font-medium text-foreground">Nenhum projeto encontrado</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Tente ajustar os filtros selecionados
                                                </p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={handleClearFilters}>
                                                Limpar filtros
                                            </Button>
                                        </div>
                                    }
                                />
                            )}
                            
                            {/* Pagination */}
                            {filteredProjects.length > 0 && (
                                <div className="border-t bg-muted/30 px-4 py-3">
                                    <Pagination 
                                        page={page} 
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setPage}
                                        onItemsPerPageChange={(items) => {
                                            setItemsPerPage(items);
                                            setPage(1);
                                        }}
                                    />
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bar */}
            <BulkActionsBar
                count={selectedRows.length}
                onCompare={() => setIsCompareOpen(true)}
                onExport={(format) => handleExport(format, true)}
                onClear={() => setSelectedRows([])}
            />

            {/* Comparison Modal */}
            <ComparisonModal
                isOpen={isCompareOpen}
                onClose={() => setIsCompareOpen(false)}
                projects={selectedRows.slice(0, 4)}
            />

            {/* Save Filter Modal */}
            <SaveFilterModal
                isOpen={isSaveFilterOpen}
                onClose={() => setIsSaveFilterOpen(false)}
                onSave={handleSaveFilter}
                filters={filters}
            />
        </div>
    );
}
