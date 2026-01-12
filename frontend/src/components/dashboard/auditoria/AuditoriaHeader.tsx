"use client";

import React from 'react';
import { Upload, FileText, ChevronRight, CheckCircle2, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AuditoriaHeaderProps {
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isSaving: boolean;
    isAutoMatching: boolean;
    isValidating: boolean;
    onAutoMatch: () => void;
    onValidate: () => void;
    hasTransactions: boolean;
    accountInfo?: {
        bankId: string;
        accountId: string;
        ledgerBalance: number;
    };
    stats: {
        totalCredits: number;
        totalDebits: number;
        initialBalance: number; // Placeholder if we can't calc easily
    };
}

export const AuditoriaHeader: React.FC<AuditoriaHeaderProps> = ({
    onFileUpload,
    isSaving,
    onAutoMatch,
    onValidate,
    hasTransactions,
    accountInfo,
    stats
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 overflow-hidden">
            {/* Top Bar: Actions & Branding */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-600 rounded-md flex items-center justify-center text-white shadow-sm">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">EXTRATO INTEGRADO & AUDITORIA</h1>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                            <span>SISTEMA MRK</span>
                            <ChevronRight className="h-3 w-3" />
                            <span>CONTROLE FINANCEIRO</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".ofx"
                            onChange={onFileUpload}
                            disabled={isSaving}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <Button variant="outline" size="sm" className="gap-2 bg-white text-slate-700 shadow-sm" disabled={isSaving}>
                            <Upload className="h-3.5 w-3.5" />
                            {isSaving ? 'Importando...' : 'Importar OFX'}
                        </Button>
                    </div>
                    <Button onClick={onValidate} disabled={!hasTransactions} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Validar
                    </Button>
                </div>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-sm">
                <div className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Banco / Conta</span>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{accountInfo?.bankId || '---'}</span>
                        <span className="text-slate-300">/</span>
                        <span className="font-mono text-slate-600">{accountInfo?.accountId || '---'}</span>
                    </div>
                </div>

                <div className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Créditos</span>
                    <div className="flex items-center gap-2 text-emerald-600 font-medium">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-mono">{stats.totalCredits > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalCredits)}</span>
                    </div>
                </div>

                <div className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Débitos</span>
                    <div className="flex items-center gap-2 text-rose-600 font-medium">
                        <TrendingDown className="h-3 w-3" />
                        <span className="font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalDebits)}</span>
                    </div>
                </div>

                <div className="p-4 flex flex-col gap-1 bg-slate-50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Saldo Final (Arquivo)</span>
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                        <Scale className="h-4 w-4 text-slate-400" />
                        <span className="font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accountInfo?.ledgerBalance || 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
