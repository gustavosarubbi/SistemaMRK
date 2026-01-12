"use client";

import React, { useState } from 'react';
import { Search, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';

interface ProjectSelectorProps {
    currentProjectId?: string;
    projects: any[];
    onSelect: (projectId: string) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
    currentProjectId,
    projects,
    onSelect
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedProject = projects.find(p => p.CTT_CUSTO === currentProjectId);

    const filteredProjects = projects.filter(p =>
        p.CTT_CUSTO.toLowerCase().includes(search.toLowerCase()) ||
        p.CTT_DESC01.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 100);

    return (
        <>
            <Button
                variant="outline"
                role="combobox"
                className={`h-8 w-full justify-between text-xs font-normal border-indigo-100 ${currentProjectId ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'text-slate-500'}`}
                onClick={() => setOpen(true)}
            >
                <span className="truncate">
                    {currentProjectId ? `${currentProjectId} - ${selectedProject?.CTT_DESC01 || ''}` : "Selecionar projeto..."}
                </span>
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Selecionar Projeto</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por código ou nome..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto rounded-md border border-slate-100">
                            <div className="flex flex-col">
                                <button
                                    onClick={() => {
                                        onSelect('unlinked');
                                        setOpen(false);
                                    }}
                                    className="flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50 text-left border-b border-slate-50"
                                >
                                    <span className="text-slate-500 italic">Sem projeto (Desvincular)</span>
                                    {!currentProjectId && <Check className="h-4 w-4 text-indigo-600" />}
                                </button>
                                {filteredProjects.map((p) => (
                                    <button
                                        key={p.CTT_CUSTO}
                                        onClick={() => {
                                            onSelect(p.CTT_CUSTO);
                                            setOpen(false);
                                        }}
                                        className="flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50 text-left"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{p.CTT_CUSTO}</span>
                                            <span className="text-xs text-slate-500">{p.CTT_DESC01}</span>
                                        </div>
                                        {currentProjectId === p.CTT_CUSTO && <Check className="h-4 w-4 text-indigo-600" />}
                                    </button>
                                ))}
                                {filteredProjects.length === 0 && (
                                    <div className="p-4 text-center text-sm text-slate-400">
                                        Nenhum projeto encontrado.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
