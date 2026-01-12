"use client";

import React from 'react';
import { Loader2, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

import { ProjectSelector } from './ProjectSelector';
import { Pagination } from '@/components/ui/pagination';

interface AuditoriaTableProps {
    data: any[];
    projects: any[];
    onAssociate: (txId: number, projectId: string) => void;
    isSearching: boolean;
    // Pagination props
    page: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

// Memoized Row Component for maximum performance
const TransactionRow = React.memo(({ tx, projects, onAssociate }: { tx: any, projects: any[], onAssociate: any }) => (
    <tr className="hover:bg-indigo-50/30 transition-colors border-b border-slate-100 last:border-0 h-8">
        <td className="px-3 py-1 text-slate-600 font-mono text-xs whitespace-nowrap">
            {format(new Date(tx.dt_posted), 'dd/MM/yyyy')}
        </td>
        <td className="px-3 py-1 text-slate-600 font-mono text-xs whitespace-nowrap">
            {format(new Date(tx.dt_posted), 'dd/MM/yyyy')}
        </td>
        <td className="px-3 py-1 text-slate-400 font-mono text-[10px] text-center">
            {tx.ag_origin || ''}
        </td>
        <td className="px-3 py-1 text-slate-400 font-mono text-[10px] text-center">
            {tx.batch_id || ''}
        </td>
        <td className="px-3 py-1">
            <div className="font-medium text-slate-800 text-xs break-words min-w-[300px] leading-tight flex items-center justify-between">
                <span>{tx.memo}</span>
                {tx.validation_status === 'VALIDATED' && <Check className="h-3 w-3 text-emerald-500 ml-2" />}
            </div>
        </td>
        <td className="px-3 py-1 text-slate-600 font-mono text-xs text-right">
            {tx.check_num || ''}
        </td>
        <td className={`px-3 py-1 text-right font-mono text-xs font-semibold ${tx.amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {tx.amount < 0 ? '' : '+'}
            {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.amount)}
            {tx.amount < 0 ? ' D' : ' C'}
        </td>
        <td className="px-3 py-1 text-right font-mono text-xs text-slate-700 font-medium">
            {tx.balance !== undefined ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.balance) : '-'}
            {tx.balance !== undefined ? ' C' : ''}
        </td>
        <td className="px-3 py-1 min-w-[200px]">
            <ProjectSelector
                currentProjectId={tx.project_id}
                projects={projects}
                onSelect={(val) => onAssociate(tx.id, val)}
            />
        </td>
    </tr>
));

TransactionRow.displayName = 'TransactionRow';

export const AuditoriaTable: React.FC<AuditoriaTableProps> = ({
    data,
    projects,
    onAssociate,
    isSearching,
    page,
    totalPages,
    totalItems,
    onPageChange
}) => {
    return (
        <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden text-slate-800">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[100px] text-xs uppercase tracking-wider">Dt. Balanc.</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[100px] text-xs uppercase tracking-wider">Dt. Movim.</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[70px] text-xs uppercase tracking-wider">Ag.</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[70px] text-xs uppercase tracking-wider">Lote</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 text-xs uppercase tracking-wider">Histórico</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[100px] text-right text-xs uppercase tracking-wider">Doc.</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[110px] text-right text-xs uppercase tracking-wider">Valor R$</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[110px] text-right text-xs uppercase tracking-wider">Saldo</th>
                            <th className="px-3 py-2 font-semibold text-slate-700 w-[200px] text-xs uppercase tracking-wider">Projeto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.length > 0 ? (
                            data.map((tx) => (
                                <TransactionRow
                                    key={tx.id}
                                    tx={tx}
                                    projects={projects}
                                    onAssociate={onAssociate}
                                />
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                                    {isSearching ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                                            <span className="text-xs">Carregando extrato...</span>
                                        </div>
                                    ) : "Nenhum lançamento encontrado."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 0 && (
                <div className="p-2 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500 font-mono">
                    <span>REGISTROS: {totalItems}</span>
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={onPageChange}
                    />
                    <span>PÁGINA {page}/{totalPages}</span>
                </div>
            )}
        </div>
    );
};
