import { AdvancedProjectFilters, FilterPreset } from '@/types';

export interface FilterPresetConfig {
    id: FilterPreset;
    name: string;
    description: string;
    icon: string;
    color: string;
    bgColor: string;
    filters: Partial<AdvancedProjectFilters>;
}

export const FILTER_PRESETS: Record<FilterPreset, FilterPresetConfig> = {
    all: {
        id: 'all',
        name: 'Todos',
        description: 'Todos os projetos',
        icon: 'Briefcase',
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
        filters: {},
    },
    critical: {
        id: 'critical',
        name: 'Críticos',
        description: 'Vigência vence em ≤7 dias, PC urgente ou execução >100%',
        icon: 'AlertOctagon',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        filters: {
            // Será filtrado no cliente com lógica customizada
        },
    },
    urgent_attention: {
        id: 'urgent_attention',
        name: 'Atenção Urgente',
        description: 'Vence em 7 dias ou execução >85%',
        icon: 'AlertTriangle',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        filters: {
            vigenciaDaysRange: 'week',
        },
    },
    ending_soon: {
        id: 'ending_soon',
        name: 'Finalizando em Breve',
        description: 'Vence nos próximos 30 dias',
        icon: 'Clock',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        filters: {
            vigenciaDaysRange: '30days',
        },
    },
    render_accounts: {
        id: 'render_accounts',
        name: 'Prestar Contas',
        description: 'Projetos em período de prestação',
        icon: 'FileCheck',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        filters: {
            status: 'rendering_accounts',
        },
    },
};

export const PRESET_ORDER: FilterPreset[] = [
    'critical',
    'urgent_attention',
    'ending_soon',
    'render_accounts',
];

/**
 * Obtém configuração de um preset
 */
export function getPresetConfig(preset: FilterPreset): FilterPresetConfig {
    return FILTER_PRESETS[preset];
}

/**
 * Obtém lista de presets para exibição (excluindo 'all')
 */
export function getDisplayPresets(): FilterPresetConfig[] {
    return PRESET_ORDER.map(id => FILTER_PRESETS[id]);
}

