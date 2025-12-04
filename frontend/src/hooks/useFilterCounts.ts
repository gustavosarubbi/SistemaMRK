'use client';

import { useMemo } from 'react';
import { Project, FilterCounts } from '@/types';
import { 
    getDaysRemaining, 
    getDaysSinceEnd,
    isInExecution,
    isNotStarted,
    isInRenderingAccountsPeriod,
    getDaysRemainingForAccountRendering,
    isRenderingAccountsUrgent,
} from '@/lib/date-utils';
import { getProjectClassification, getServiceType } from '@/lib/project-mappings';

/**
 * Hook para calcular contagens dinâmicas de projetos por categoria
 */
export function useFilterCounts(projects: Project[]): FilterCounts {
    return useMemo(() => {
        const counts: FilterCounts = {
            byStatus: {
                inExecution: 0,
                renderingAccounts: 0,
                finished: 0,
                notStarted: 0,
            },
            byDaysRemaining: {
                overdue: 0,
                today: 0,
                week: 0,
                month: 0,
                twoMonths: 0,
            },
            byExecution: {
                low: 0,
                medium: 0,
                high: 0,
                exceeded: 0,
            },
            byCoordinator: {},
            byClient: {},
            byClassification: {},
            byServiceType: {},
        };

        projects.forEach(project => {
            const daysRemaining = getDaysRemaining(project.CTT_DTFIM);
            const daysSinceEnd = getDaysSinceEnd(project.CTT_DTFIM);
            const execution = project.usage_percent || 0;

            // Por Status
            if (isNotStarted(project.CTT_DTINI)) {
                counts.byStatus.notStarted++;
            } else if (isInExecution(project.CTT_DTINI, project.CTT_DTFIM)) {
                counts.byStatus.inExecution++;
            } else if (isInRenderingAccountsPeriod(project.CTT_DTFIM)) {
                counts.byStatus.renderingAccounts++;
            } else if (daysSinceEnd > 60) {
                counts.byStatus.finished++;
            }

            // Por Dias Restantes (apenas projetos em execução - vigência ainda não terminou)
            if (daysRemaining !== null && daysRemaining >= 0) {
                if (daysRemaining === 0) {
                    counts.byDaysRemaining.today++;
                } else if (daysRemaining <= 7) {
                    counts.byDaysRemaining.week++;
                } else if (daysRemaining <= 30) {
                    counts.byDaysRemaining.month++;
                } else if (daysRemaining <= 60) {
                    counts.byDaysRemaining.twoMonths++;
                }
            }
            // Não contamos "overdue" porque projetos finalizados não aparecem como atrasados

            // Por Execução Financeira
            if (execution > 100) {
                counts.byExecution.exceeded++;
            } else if (execution >= 85) {
                counts.byExecution.high++;
            } else if (execution >= 50) {
                counts.byExecution.medium++;
            } else {
                counts.byExecution.low++;
            }

            // Por Coordenador
            const coordinator = project.CTT_NOMECO || 'Sem coordenador';
            counts.byCoordinator[coordinator] = (counts.byCoordinator[coordinator] || 0) + 1;

            // Por Cliente
            const client = project.CTT_UNIDES || 'Sem cliente';
            counts.byClient[client] = (counts.byClient[client] || 0) + 1;

            // Por Classificação
            const classification = getProjectClassification(project.CTT_CLAPRJ);
            counts.byClassification[classification] = (counts.byClassification[classification] || 0) + 1;

            // Por Tipo de Prestação
            const serviceType = getServiceType(project.CTT_TPCONV);
            counts.byServiceType[serviceType] = (counts.byServiceType[serviceType] || 0) + 1;
        });

        return counts;
    }, [projects]);
}

/**
 * Hook para calcular contagens de urgência
 */
export function useUrgencyCounts(projects: Project[]) {
    return useMemo(() => {
        let critical = 0;
        let urgentWeek = 0;
        let renderingAccounts = 0;
        let renderingUrgent = 0; // Prestação de contas urgente (≤15 dias)
        let vencendoHoje = 0;

        projects.forEach(project => {
            const daysRemaining = getDaysRemaining(project.CTT_DTFIM);
            const execution = project.usage_percent || 0;
            const daysSinceEnd = getDaysSinceEnd(project.CTT_DTFIM);
            const isRendering = isInRenderingAccountsPeriod(project.CTT_DTFIM);

            // Críticos: vigência vence em ≤7 dias OU prestação de contas urgente OU execução > 100%
            if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7) {
                critical++;
            }
            if (isRenderingAccountsUrgent(project.CTT_DTFIM)) {
                critical++;
            }
            if (execution > 100) {
                critical++;
            }

            // Vencendo hoje (vigência)
            if (daysRemaining === 0) {
                vencendoHoje++;
            }

            // Urgente (vigência nos próximos 7 dias)
            if (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7) {
                urgentWeek++;
            }

            // Prestação de contas (todos em período de prestação)
            if (isRendering) {
                renderingAccounts++;
                
                // Prestação de contas urgente (≤15 dias restantes)
                const renderingDaysRemaining = getDaysRemainingForAccountRendering(project.CTT_DTFIM);
                if (renderingDaysRemaining !== null && renderingDaysRemaining <= 15) {
                    renderingUrgent++;
                }
            }
        });

        return {
            critical,
            urgentWeek,
            renderingAccounts,
            renderingUrgent, // Substitui "overdue"
            vencendoHoje,
        };
    }, [projects]);
}

