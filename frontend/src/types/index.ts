export interface KPI {
    total_projects: number;
    total_budget: number;
    total_realized: number;
    total_billing?: number;
    balance: number;
    financial_balance?: number;
    in_execution?: number;
    ending_soon?: number;
}

export interface ChartData {
    name: string;
    value: number;
}

export interface TrendData {
    month: string;
    budget: number;
    realized: number;
}

export interface StatusDistributionData {
    name: string;
    value: number;
    color: string;
}

export interface ExecutionPercentData {
    range: string; // "0-25%", "25-50%", etc.
    count: number;
    total_budget: number;
}

export interface ProjectListItem {
    id: string;
    name: string;
    daysRemaining: number | null;
    budget: number;
    realized: number;
    usage_percent: number;
    status: string;
}

export interface DashboardData {
    kpis: KPI;
    charts: {
        top_projects: ChartData[];
        trend: TrendData[];
        status_distribution: StatusDistributionData[];
        execution_by_percent: ExecutionPercentData[];
    };
    status_stats: {
        in_execution: number;
        ending_soon: number;
        rendering_accounts: number;
        rendering_accounts_60days: number;
        not_started: number;
    };
    projects_in_execution?: ProjectListItem[];
    projects_ending_soon?: ProjectListItem[];
}

export type TimeRangePreset =
    | 'custom'
    | 'last30'
    | 'last90'
    | 'last180'
    | 'last365'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'last_quarter'
    | 'this_year'
    | 'last_year';

export interface Project {
    CTT_CUSTO: string;
    CTT_DESC01: string;
    CTT_UNIDES: string;
    CTT_DTINI: string;
    CTT_DTFIM: string;
    CTT_DTENC?: string;
    CTT_SALINI: number;
    budget: number;
    CTT_CLASSE?: string;
    CTT_BLOQ?: string;
    CTT_NOMECO?: string;
    CTT_COORDE?: string;
    CTT_ANALIS?: string;
    CTT_ANADES?: string;
    CTT_CLAPRJ?: string;
    CTT_TPCONV?: string;
    realized?: number;
    usage_percent?: number;
    initial_balance?: number;
}

export interface ProjectStats {
    total: number;
    in_execution: number;
    rendering_accounts: number;
    rendering_accounts_60days: number;
    not_started: number;
    closed?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    stats?: ProjectStats;
}

// Tipos para filtros salvos
export interface ProjectFilters {
    search?: string;
    startDate?: string;
    endDate?: string;
    coordinator?: string;
    client?: string;
    status?: string;
    showApprovedOnly?: boolean;
}

// Faixas de dias restantes
export type DaysRemainingRange =
    | 'all'           // Todos
    | 'today'         // Vence hoje
    | 'week'          // Próximos 7 dias
    | '15days'        // Próximos 15 dias
    | '30days'        // Próximos 30 dias
    | '60days'        // Próximos 60 dias
    | '90days'        // Próximos 90 dias
    | 'custom';       // Range customizado

// Faixas de execução financeira
export type ExecutionRange =
    | 'all'           // Todos
    | 'low'           // 0-50%
    | 'medium'        // 50-85%
    | 'high'          // 85-100%
    | 'exceeded'      // >100%
    | 'custom';       // Range customizado

// Presets de filtros
export type FilterPreset =
    | 'all'                  // Todos os projetos
    | 'critical'             // Projetos críticos
    | 'urgent_attention'     // Atenção urgente
    | 'ending_soon'          // Finalizando em breve
    | 'render_accounts'      // Prestar contas
    | 'rendering_urgent';    // Prestação de contas urgente

// Status de tempo do projeto
export type TimeStatus = 'overdue' | 'critical' | 'warning' | 'normal' | 'safe' | 'not_started';

// Nível de urgência (0-4)
export type UrgencyLevel = 0 | 1 | 2 | 3 | 4;

// Filtros avançados extendidos
export interface AdvancedProjectFilters extends ProjectFilters {
    // Filtros de vigência
    vigenciaDaysRange?: DaysRemainingRange;
    vigenciaDaysMin?: number;
    vigenciaDaysMax?: number;
    // Filtros de execução financeira
    executionRange?: ExecutionRange;
    executionMin?: number;
    executionMax?: number;
    activePreset?: FilterPreset;
    classification?: string;
    serviceType?: string;
    analyst?: string;
}

// Contadores de filtros
export interface FilterCounts {
    byStatus: {
        inExecution: number;
        renderingAccounts: number;
        notStarted: number;
        closed: number;
    };
    byDaysRemaining: {
        overdue: number;
        today: number;
        week: number;
        month: number;
        twoMonths: number;
    };
    byExecution: {
        low: number;
        medium: number;
        high: number;
        exceeded: number;
    };
    byCoordinator: Record<string, number>;
    byClient: Record<string, number>;
    byClassification: Record<string, number>;
    byServiceType: Record<string, number>;
    byAnalyst: Record<string, number>;
}

export interface SavedFilter {
    id: string;
    name: string;
    createdAt: string;
    filters: ProjectFilters;
}

// Tipos para preferências de projetos
export type ViewMode = 'table' | 'cards' | 'compact';

export interface ProjectPreferences {
    visibleColumns: string[];
    columnWidths: Record<string, number>;
    pinnedColumns: string[];
    savedFilters: SavedFilter[];
    viewMode: ViewMode;
    itemsPerPage: number;
    isFiltersOpen: boolean;
}

// Nota do projeto
export interface ProjectNote {
    id: string;
    project_id: string;
    content: string;
    author: string;
    created_at: string;
    updated_at?: string;
}

// Anexo do projeto
export interface ProjectAttachment {
    id: string;
    project_id: string;
    filename: string;
    category: 'contract' | 'invoice' | 'report' | 'other';
    size: number;
    uploaded_by: string;
    uploaded_at: string;
    url: string;
}

// Configuração de período para comparação de tendência
export interface TrendPeriod {
    type: 'last_month' | 'last_quarter' | 'year_ago' | 'custom';
    start_date?: string;
    end_date?: string;
}

// Movimentação com dados agregados
export interface MovementSummary {
    total: number;
    count: number;
    average: number;
    max: number;
    min: number;
    by_month: { month: string; value: number }[];
    by_type: { type: string; value: number; count: number }[];
}
