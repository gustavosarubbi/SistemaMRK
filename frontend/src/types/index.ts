export interface KPI {
    total_projects: number;
    total_budget: number;
    total_realized: number;
    balance: number;
}

export interface ChartData {
    name: string;
    value: number;
}

export interface DashboardData {
    kpis: KPI;
    charts: {
        top_projects: ChartData[];
    };
}

export interface Project {
    CTT_CUSTO: string;
    CTT_DESC01: string;
    CTT_UNIDES: string;
    CTT_DTINI: string;
    CTT_DTFIM: string;
    CTT_SALINI: number;
    budget: number;
    CTT_CLASSE?: string;
    CTT_BLOQ?: string;
    CTT_NOMECO?: string;
    CTT_COORDE?: string;
    CTT_ANALIS?: string;
    CTT_ANADES?: string;
    realized?: number;
    usage_percent?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}
