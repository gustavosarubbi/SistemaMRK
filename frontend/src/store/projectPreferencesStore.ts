import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectPreferences, SavedFilter, ViewMode } from '@/types';

// Colunas padrão visíveis
const DEFAULT_VISIBLE_COLUMNS = [
    'select',
    'CTT_CUSTO',
    'CTT_DESC01',
    'CTT_CLAPRJ',
    'CTT_TPCONV',
    'period',
    'timeline',
    'vigenciaDaysRemaining',
    'renderingDaysRemaining',
    'CTT_NOMECO',
    'budget',
    'realized',
    'usage_percent',
    'actions',
];

// Larguras padrão das colunas
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
    select: 50,
    CTT_CUSTO: 90,
    CTT_DESC01: 200,
    CTT_CLAPRJ: 100,
    CTT_TPCONV: 100,
    period: 120,
    timeline: 140,
    vigenciaDaysRemaining: 150,
    renderingDaysRemaining: 150,
    CTT_NOMECO: 140,
    budget: 120,
    realized: 120,
    usage_percent: 160,
    actions: 50,
};

interface ProjectPreferencesState extends ProjectPreferences {
    // Actions
    setVisibleColumns: (columns: string[]) => void;
    toggleColumn: (columnId: string) => void;
    setColumnWidth: (columnId: string, width: number) => void;
    setColumnWidths: (widths: Record<string, number>) => void;
    setPinnedColumns: (columns: string[]) => void;
    togglePinnedColumn: (columnId: string) => void;
    setViewMode: (mode: ViewMode) => void;
    setItemsPerPage: (count: number) => void;
    setIsFiltersOpen: (isOpen: boolean) => void;
    
    // Saved Filters Actions
    addSavedFilter: (filter: SavedFilter) => void;
    updateSavedFilter: (id: string, updates: Partial<SavedFilter>) => void;
    removeSavedFilter: (id: string) => void;
    
    // Reset
    resetToDefaults: () => void;
}

const initialState: ProjectPreferences = {
    visibleColumns: DEFAULT_VISIBLE_COLUMNS,
    columnWidths: DEFAULT_COLUMN_WIDTHS,
    pinnedColumns: ['CTT_CUSTO'],
    savedFilters: [],
    viewMode: 'table',
    itemsPerPage: 10,
    isFiltersOpen: true,
};

export const useProjectPreferencesStore = create<ProjectPreferencesState>()(
    persist(
        (set) => ({
            ...initialState,

            setVisibleColumns: (columns) => set({ visibleColumns: columns }),

            toggleColumn: (columnId) =>
                set((state) => {
                    const isVisible = state.visibleColumns.includes(columnId);
                    return {
                        visibleColumns: isVisible
                            ? state.visibleColumns.filter((c) => c !== columnId)
                            : [...state.visibleColumns, columnId],
                    };
                }),

            setColumnWidth: (columnId, width) =>
                set((state) => ({
                    columnWidths: { ...state.columnWidths, [columnId]: width },
                })),

            setColumnWidths: (widths) =>
                set((state) => ({
                    columnWidths: { ...state.columnWidths, ...widths },
                })),

            setPinnedColumns: (columns) => set({ pinnedColumns: columns }),

            togglePinnedColumn: (columnId) =>
                set((state) => {
                    const isPinned = state.pinnedColumns.includes(columnId);
                    return {
                        pinnedColumns: isPinned
                            ? state.pinnedColumns.filter((c) => c !== columnId)
                            : [...state.pinnedColumns, columnId],
                    };
                }),

            setViewMode: (mode) => set({ viewMode: mode }),

            setItemsPerPage: (count) => set({ itemsPerPage: count }),

            setIsFiltersOpen: (isOpen) => set({ isFiltersOpen: isOpen }),

            addSavedFilter: (filter) =>
                set((state) => ({
                    savedFilters: [...state.savedFilters, filter],
                })),

            updateSavedFilter: (id, updates) =>
                set((state) => ({
                    savedFilters: state.savedFilters.map((f) =>
                        f.id === id ? { ...f, ...updates } : f
                    ),
                })),

            removeSavedFilter: (id) =>
                set((state) => ({
                    savedFilters: state.savedFilters.filter((f) => f.id !== id),
                })),

            resetToDefaults: () => set(initialState),
        }),
        {
            name: 'project-preferences',
            partialize: (state) => ({
                visibleColumns: state.visibleColumns,
                columnWidths: state.columnWidths,
                pinnedColumns: state.pinnedColumns,
                savedFilters: state.savedFilters,
                viewMode: state.viewMode,
                itemsPerPage: state.itemsPerPage,
                isFiltersOpen: state.isFiltersOpen,
            }),
        }
    )
);

// Selector hooks para otimização de re-renders
export const useVisibleColumns = () =>
    useProjectPreferencesStore((state) => state.visibleColumns);

export const useColumnWidths = () =>
    useProjectPreferencesStore((state) => state.columnWidths);

export const usePinnedColumns = () =>
    useProjectPreferencesStore((state) => state.pinnedColumns);

export const useSavedFilters = () =>
    useProjectPreferencesStore((state) => state.savedFilters);

export const useViewMode = () =>
    useProjectPreferencesStore((state) => state.viewMode);

export const useItemsPerPage = () =>
    useProjectPreferencesStore((state) => state.itemsPerPage);

export const useIsFiltersOpen = () =>
    useProjectPreferencesStore((state) => state.isFiltersOpen);

