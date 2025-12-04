'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SummaryTab } from './tabs/summary-tab';
import { ChartsTab } from './tabs/charts-tab';
import { MovementsTab } from './tabs/movements-tab';
import { NotesTab } from './tabs/notes-tab';
import { AttachmentsTab } from './tabs/attachments-tab';
import { Project } from '@/types';

interface ProjectTabsProps {
    project: Project;
    movements: any[];
    isLoadingMovements: boolean;
    movementsError: any;
    formatDate: (dateStr: string) => string;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export function ProjectTabs({
    project,
    movements,
    isLoadingMovements,
    movementsError,
    formatDate,
    activeTab = 'summary',
    onTabChange,
}: ProjectTabsProps) {
    const handleTabChange = (value: string) => {
        if (onTabChange) {
            onTabChange(value);
        }
    };

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6 overflow-x-auto">
                <TabsTrigger value="summary" className="text-xs sm:text-sm whitespace-nowrap">
                    Resumo
                </TabsTrigger>
                <TabsTrigger value="charts" className="text-xs sm:text-sm whitespace-nowrap">
                    Gráficos
                </TabsTrigger>
                <TabsTrigger value="movements" className="text-xs sm:text-sm whitespace-nowrap">
                    Movimentações
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm whitespace-nowrap">
                    Notas
                </TabsTrigger>
                <TabsTrigger value="attachments" className="text-xs sm:text-sm whitespace-nowrap">
                    Anexos
                </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-0">
                <SummaryTab project={project} />
            </TabsContent>

            <TabsContent value="charts" className="mt-0">
                <ChartsTab
                    movements={movements}
                    budget={project.budget || 0}
                    realized={project.realized || 0}
                    formatDate={formatDate}
                />
            </TabsContent>

            <TabsContent value="movements" className="mt-0">
                <MovementsTab
                    movements={movements}
                    isLoading={isLoadingMovements}
                    error={movementsError}
                    formatDate={formatDate}
                    projectName={project.CTT_DESC01 || 'Projeto'}
                    projectCode={project.CTT_CUSTO}
                />
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
                <NotesTab projectId={project.CTT_CUSTO} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0">
                <AttachmentsTab projectId={project.CTT_CUSTO} />
            </TabsContent>
        </Tabs>
    );
}

