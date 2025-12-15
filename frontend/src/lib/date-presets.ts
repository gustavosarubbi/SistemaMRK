import { TimeRangePreset } from '@/types';

/**
 * Calcula as datas de início e fim para um preset de período
 */
export function getDateRangeForPreset(preset: TimeRangePreset): { startDate: Date | undefined; endDate: Date | undefined } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate: Date | undefined;
    let endDate: Date | undefined = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    
    switch (preset) {
        case 'last30':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            break;
            
        case 'last90':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 90);
            break;
            
        case 'last180':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 180);
            break;
            
        case 'last365':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 365);
            break;
            
        case 'this_month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'last_month':
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
            endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'this_quarter':
            const currentQuarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
            endDate = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'last_quarter':
            const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
            const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
            const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
            startDate = new Date(lastQuarterYear, lastQuarterMonth, 1);
            endDate = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'this_year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'last_year':
            startDate = new Date(today.getFullYear() - 1, 0, 1);
            endDate = new Date(today.getFullYear() - 1, 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'custom':
        default:
            startDate = undefined;
            endDate = undefined;
            break;
    }
    
    return { startDate, endDate };
}

/**
 * Detecta qual preset corresponde a um range de datas
 */
export function detectPresetFromDates(
    startDate: Date | undefined,
    endDate: Date | undefined
): TimeRangePreset {
    if (!startDate || !endDate) {
        return 'custom';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Check if end date is today
    const endIsToday = end.getTime() >= today.getTime() && 
                      end.getTime() <= today.getTime() + 86400000;
    
    if (!endIsToday) {
        return 'custom';
    }
    
    // Calculate days difference
    const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check presets by days
    if (daysDiff >= 0 && daysDiff <= 30) {
        // Check if it's exactly this month
        if (start.getMonth() === today.getMonth() && 
            start.getFullYear() === today.getFullYear() &&
            start.getDate() === 1) {
            return 'this_month';
        }
        return 'last30';
    } else if (daysDiff > 30 && daysDiff <= 90) {
        return 'last90';
    } else if (daysDiff > 90 && daysDiff <= 180) {
        return 'last180';
    } else if (daysDiff > 180 && daysDiff <= 365) {
        return 'last365';
    }
    
    // Check if it's last month
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    if (start.getTime() === lastMonth.getTime() && 
        end.getMonth() === lastMonth.getMonth()) {
        return 'last_month';
    }
    
    // Check if it's this quarter
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const quarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
    if (start.getTime() === quarterStart.getTime()) {
        return 'this_quarter';
    }
    
    // Check if it's this year
    const yearStart = new Date(today.getFullYear(), 0, 1);
    if (start.getTime() === yearStart.getTime()) {
        return 'this_year';
    }
    
    return 'custom';
}

/**
 * Retorna o label formatado para um preset
 */
export function getPresetLabel(preset: TimeRangePreset): string {
    const labels: Record<TimeRangePreset, string> = {
        'custom': 'Personalizado',
        'last30': 'Últimos 30 dias',
        'last90': 'Últimos 90 dias',
        'last180': 'Últimos 6 meses',
        'last365': 'Último ano',
        'this_month': 'Este mês',
        'last_month': 'Mês passado',
        'this_quarter': 'Este trimestre',
        'last_quarter': 'Trimestre passado',
        'this_year': 'Este ano',
        'last_year': 'Ano passado',
    };
    
    return labels[preset] || 'Personalizado';
}

/**
 * Formata um range de datas para exibição
 */
export function formatDateRange(
    startDate: Date | undefined,
    endDate: Date | undefined
): string {
    if (!startDate || !endDate) {
        return 'Período não definido';
    }
    
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}






