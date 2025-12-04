'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Project } from '@/types';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectDetailsSkeleton } from '@/components/projects/details/project-details-skeleton';
import { ProjectTabs } from '@/components/projects/details/project-tabs';
import { ProjectActionsMenu } from '@/components/projects/details/project-actions-menu';

export default function ProjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [activeTab, setActiveTab] = useState('summary');

    // Fetch Project Details
    const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
        queryKey: ['project', id],
        queryFn: async () => {
            const res = await api.get(`/projects/${id}`);
            return res.data;
        },
        retry: 1,
        refetchOnWindowFocus: false,
    });

    // Fetch Movements (Expenses)
    const { data: movements = [], isLoading: isLoadingMovements, error: movementsError } = useQuery<any[]>({
        queryKey: ['project_movements', id],
        queryFn: async () => {
            try {
                const res = await api.get(`/movements/${id}`);
                return res.data || [];
            } catch (error) {
                console.error('Erro ao carregar movimentações:', error);
                return [];
            }
        },
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return '-';
        return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    };

    const handleAddNote = () => {
        setActiveTab('notes');
    };

    const handleAddAttachment = () => {
        setActiveTab('attachments');
    };

    if (isLoadingProject) {
        return <ProjectDetailsSkeleton />;
    }

    if (!project || !project.CTT_CUSTO) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <p className="text-muted-foreground">Projeto não encontrado.</p>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <PageHeader
                    title={project.CTT_DESC01 || 'Detalhes do Projeto'}
                    description={`Código: ${project.CTT_CUSTO}${project.CTT_UNIDES ? ` • ${project.CTT_UNIDES}` : ''}`}
                    breadcrumbItems={[
                        { label: 'Projetos', href: '/dashboard/projects' },
                        { label: project.CTT_DESC01 || 'Detalhes' }
                    ]}
                />
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${project.CTT_BLOQ === '1' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {project.CTT_BLOQ === '1' ? 'Bloqueado' : 'Ativo'}
                    </span>
                    <ProjectActionsMenu
                        projectId={project.CTT_CUSTO}
                        onAddNote={handleAddNote}
                        onAddAttachment={handleAddAttachment}
                    />
                </div>
            </div>

            {/* Tabs */}
            <ProjectTabs
                project={project}
                movements={movements}
                isLoadingMovements={isLoadingMovements}
                movementsError={movementsError}
                formatDate={formatDate}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </div>
    );
}

