import { Project, TimeStatus, UrgencyLevel } from '@/types';

/**
 * Converte data no formato YYYYMMDD para objeto Date
 */
export function parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.length !== 8) return null;
    
    const year = Number(dateStr.substring(0, 4));
    const month = Number(dateStr.substring(4, 6)) - 1;
    const day = Number(dateStr.substring(6, 8));
    
    return new Date(year, month, day);
}

/**
 * Retorna a data de hoje sem horas
 */
export function getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/**
 * Calcula dias restantes até o fim do projeto
 * Retorna número negativo se já passou
 */
export function getDaysRemaining(endDate: string): number | null {
    const end = parseDate(endDate);
    if (!end) return null;
    
    const today = getToday();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula dias desde o fim do projeto (para prestação de contas)
 * Retorna 0 se ainda não terminou
 */
export function getDaysSinceEnd(endDate: string): number {
    const remaining = getDaysRemaining(endDate);
    if (remaining === null) return 0;
    return remaining < 0 ? Math.abs(remaining) : 0;
}

/**
 * Calcula dias restantes para prestação de contas (60 dias após o fim)
 */
export function getDaysRemainingForAccountRendering(endDate: string): number | null {
    const daysSinceEnd = getDaysSinceEnd(endDate);
    if (daysSinceEnd === 0) return null; // Projeto ainda não terminou
    
    return Math.max(0, 60 - daysSinceEnd);
}

/**
 * Verifica se projeto está em período de prestação de contas
 */
export function isInRenderingAccountsPeriod(endDate: string): boolean {
    const daysSinceEnd = getDaysSinceEnd(endDate);
    return daysSinceEnd > 0 && daysSinceEnd <= 60;
}

/**
 * Verifica se projeto está atrasado na prestação de contas (> 60 dias)
 */
export function isOverdueForAccounts(endDate: string): boolean {
    const daysSinceEnd = getDaysSinceEnd(endDate);
    return daysSinceEnd > 60;
}

/**
 * Verifica se projeto está em execução
 */
export function isInExecution(startDate: string, endDate: string): boolean {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return false;
    
    const today = getToday();
    return today >= start && today <= end;
}

/**
 * Verifica se projeto ainda não iniciou
 */
export function isNotStarted(startDate: string): boolean {
    const start = parseDate(startDate);
    if (!start) return false;
    
    const today = getToday();
    return today < start;
}

/**
 * Verifica se prestação de contas está urgente (poucos dias restantes)
 */
export function isRenderingAccountsUrgent(endDate: string): boolean {
    const renderingDaysRemaining = getDaysRemainingForAccountRendering(endDate);
    // Urgente se tem 15 dias ou menos para prestar contas
    return renderingDaysRemaining !== null && renderingDaysRemaining <= 15;
}

/**
 * Verifica se projeto está em período crítico (tempo ou financeiro)
 * Crítico = vigência chegando ao fim OU prestação de contas urgente OU execução > 100%
 */
export function isProjectCritical(project: Project): boolean {
    const daysRemaining = getDaysRemaining(project.CTT_DTFIM);
    const usagePercent = project.usage_percent || 0;
    
    // Crítico se: vigência vence em 7 dias ou menos, OU prestação de contas urgente, OU execução > 100%
    if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7) return true;
    if (isRenderingAccountsUrgent(project.CTT_DTFIM)) return true;
    if (usagePercent > 100) return true;
    
    return false;
}

/**
 * Verifica se projeto precisa de atenção urgente
 */
export function needsUrgentAttention(project: Project): boolean {
    const daysRemaining = getDaysRemaining(project.CTT_DTFIM);
    const usagePercent = project.usage_percent || 0;
    
    // Atenção se: vence em 30 dias ou execução > 85%
    if (daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0) return true;
    if (usagePercent > 85) return true;
    
    return false;
}

/**
 * Obtém o nível de urgência do projeto (0-4)
 * 0 = OK, 1 = Alerta, 2 = Atenção, 3 = Crítico, 4 = Urgente
 */
export function getUrgencyLevel(project: Project): UrgencyLevel {
    const daysRemaining = getDaysRemaining(project.CTT_DTFIM);
    const usagePercent = project.usage_percent || 0;
    const renderingDaysRemaining = getDaysRemainingForAccountRendering(project.CTT_DTFIM);
    const isRendering = isInRenderingAccountsPeriod(project.CTT_DTFIM);
    
    // Nível 4 - Urgente: execução > 100% OU vigência vence hoje OU prestação de contas com ≤ 7 dias
    if (usagePercent > 100) return 4;
    if (daysRemaining === 0) return 4;
    if (isRendering && renderingDaysRemaining !== null && renderingDaysRemaining <= 7) return 4;
    
    // Nível 3 - Crítico: vigência vence em ≤ 7 dias OU prestação de contas com ≤ 15 dias OU execução > 95%
    if (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7) return 3;
    if (isRendering && renderingDaysRemaining !== null && renderingDaysRemaining <= 15) return 3;
    if (usagePercent > 95) return 3;
    
    // Nível 2 - Atenção: vigência vence em ≤ 30 dias OU prestação de contas com ≤ 30 dias OU execução > 85%
    if (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30) return 2;
    if (isRendering && renderingDaysRemaining !== null && renderingDaysRemaining <= 30) return 2;
    if (usagePercent > 85) return 2;
    
    // Nível 1 - Alerta: vigência vence em ≤ 60 dias OU prestação de contas OU execução > 70%
    if (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 60) return 1;
    if (isRendering) return 1;
    if (usagePercent > 70) return 1;
    
    // Nível 0 - OK
    return 0;
}

/**
 * Classifica projeto por status de tempo
 */
export function getTimeStatus(project: Project): TimeStatus {
    const daysRemaining = getDaysRemaining(project.CTT_DTFIM);
    
    // Não iniciado
    if (isNotStarted(project.CTT_DTINI)) {
        return 'not_started';
    }
    
    // Atrasado (já passou da data fim)
    if (daysRemaining !== null && daysRemaining < 0) {
        return 'overdue';
    }
    
    // Crítico (menos de 7 dias)
    if (daysRemaining !== null && daysRemaining <= 7) {
        return 'critical';
    }
    
    // Atenção (menos de 30 dias)
    if (daysRemaining !== null && daysRemaining <= 30) {
        return 'warning';
    }
    
    // Normal (menos de 60 dias)
    if (daysRemaining !== null && daysRemaining <= 60) {
        return 'normal';
    }
    
    // Seguro (mais de 60 dias)
    return 'safe';
}

/**
 * Obtém cor CSS baseada no nível de urgência
 */
export function getUrgencyColor(level: UrgencyLevel): string {
    switch (level) {
        case 4: return 'text-red-600';
        case 3: return 'text-orange-600';
        case 2: return 'text-amber-600';
        case 1: return 'text-yellow-600';
        default: return 'text-green-600';
    }
}

/**
 * Obtém cor de fundo CSS baseada no nível de urgência
 */
export function getUrgencyBgColor(level: UrgencyLevel): string {
    switch (level) {
        case 4: return 'bg-red-50';
        case 3: return 'bg-orange-50';
        case 2: return 'bg-amber-50';
        case 1: return 'bg-yellow-50';
        default: return '';
    }
}

/**
 * Obtém label de urgência
 */
export function getUrgencyLabel(level: UrgencyLevel): string {
    switch (level) {
        case 4: return 'Urgente';
        case 3: return 'Crítico';
        case 2: return 'Atenção';
        case 1: return 'Alerta';
        default: return 'OK';
    }
}

/**
 * Formata dias restantes para exibição
 */
export function formatDaysRemaining(days: number | null): string {
    if (days === null) return '-';
    if (days === 0) return 'Vence hoje';
    if (days === 1) return 'Vence amanhã';
    if (days < 0) return `Atrasado ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`;
    return `${days} dia${days !== 1 ? 's' : ''} restantes`;
}

/**
 * Formata dias para prestação de contas
 */
export function formatRenderingAccountsDays(endDate: string): string {
    const daysRemaining = getDaysRemainingForAccountRendering(endDate);
    if (daysRemaining === null) return '-';
    if (daysRemaining === 0) return 'Prazo esgotado';
    return `${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} para prestar contas`;
}

/**
 * Verifica se projeto está dentro de um range de dias
 */
export function isWithinDaysRange(
    endDate: string, 
    minDays: number | undefined, 
    maxDays: number | undefined
): boolean {
    const daysRemaining = getDaysRemaining(endDate);
    if (daysRemaining === null) return false;
    
    if (minDays !== undefined && daysRemaining < minDays) return false;
    if (maxDays !== undefined && daysRemaining > maxDays) return false;
    
    return true;
}

/**
 * Filtra projetos por range de dias restantes de vigência
 */
export function filterByVigenciaDaysRange(
    projects: Project[],
    range: string,
    customMin?: number,
    customMax?: number
): Project[] {
    return projects.filter(project => {
        const days = getDaysRemaining(project.CTT_DTFIM);
        // Só considera projetos em vigência (dias >= 0)
        if (days === null || days < 0) return false;
        
        switch (range) {
            case 'today':
                return days === 0;
            case 'week':
                return days > 0 && days <= 7;
            case '15days':
                return days > 0 && days <= 15;
            case '30days':
                return days > 0 && days <= 30;
            case '60days':
                return days > 0 && days <= 60;
            case '90days':
                return days > 0 && days <= 90;
            case 'custom':
                // Garante que não há valores negativos
                const min = customMin !== undefined ? Math.max(0, customMin) : undefined;
                const max = customMax !== undefined ? Math.max(0, customMax) : undefined;
                return isWithinDaysRange(project.CTT_DTFIM, min, max);
            default:
                return true;
        }
    });
}

/**
 * Filtra projetos por range de dias restantes para prestação de contas
 */
export function filterByRenderingDaysRange(
    projects: Project[],
    range: string,
    customMin?: number,
    customMax?: number
): Project[] {
    return projects.filter(project => {
        const renderingDays = getDaysRemainingForAccountRendering(project.CTT_DTFIM);
        // Só considera projetos em período de prestação de contas
        if (renderingDays === null) return false;
        
        switch (range) {
            case 'today':
                return renderingDays === 0;
            case 'week':
                return renderingDays > 0 && renderingDays <= 7;
            case '15days':
                return renderingDays > 0 && renderingDays <= 15;
            case '30days':
                return renderingDays > 0 && renderingDays <= 30;
            case '60days':
                return renderingDays > 0 && renderingDays <= 60;
            case '90days':
                return renderingDays > 0 && renderingDays <= 90;
            case 'custom':
                // Garante que não há valores negativos
                const min = customMin !== undefined ? Math.max(0, customMin) : undefined;
                const max = customMax !== undefined ? Math.max(0, customMax) : undefined;
                if (min !== undefined && renderingDays < min) return false;
                if (max !== undefined && renderingDays > max) return false;
                return true;
            default:
                return true;
        }
    });
}

/**
 * Filtra projetos por range de execução financeira
 */
export function filterByExecutionRange(
    projects: Project[],
    range: string,
    customMin?: number,
    customMax?: number
): Project[] {
    return projects.filter(project => {
        const execution = project.usage_percent || 0;
        
        switch (range) {
            case 'low':
                return execution >= 0 && execution < 50;
            case 'medium':
                return execution >= 50 && execution < 85;
            case 'high':
                return execution >= 85 && execution <= 100;
            case 'exceeded':
                return execution > 100;
            case 'custom':
                if (customMin !== undefined && execution < customMin) return false;
                if (customMax !== undefined && execution > customMax) return false;
                return true;
            default:
                return true;
        }
    });
}

