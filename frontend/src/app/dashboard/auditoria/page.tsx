"use client";

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { parseOFX } from '@/lib/utils/ofx-parser';

// Modular Components
import { AuditoriaHeader } from '@/components/dashboard/auditoria/AuditoriaHeader';
import { AuditoriaStats } from '@/components/dashboard/auditoria/AuditoriaStats';
import { AuditoriaFilters } from '@/components/dashboard/auditoria/AuditoriaFilters';
import { AuditoriaTable } from '@/components/dashboard/auditoria/AuditoriaTable';

export default function AuditoriaPage() {
    // State management
    const [dbTransactions, setDbTransactions] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(50);
    const [totalStats, setTotalStats] = useState<any>(null);

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [dateStart, setDateStart] = useState<Date | undefined>(undefined);
    const [dateEnd, setDateEnd] = useState<Date | undefined>(undefined);
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

    // New Filters States
    const [trnType, setTrnType] = useState<string>('');
    const [validationStatus, setValidationStatus] = useState<string>('');

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isAutoMatching, setIsAutoMatching] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Carregar dados iniciais
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects?limit=1000');
            setProjects(response.data.data || []);
        } catch (error) {
            console.error("Erro ao carregar projetos:", error);
        }
    };

    const fetchDbTransactions = async (pageNum = page) => {
        setIsSearching(true);
        try {
            const params = new URLSearchParams();
            params.append('skip', ((pageNum - 1) * itemsPerPage).toString());
            params.append('limit', itemsPerPage.toString());

            if (searchTerm) params.append('search', searchTerm);
            if (dateStart) params.append('start_date', dateStart.toISOString());
            if (dateEnd) params.append('end_date', dateEnd.toISOString());
            if (minAmount) params.append('min_amount', minAmount);
            if (maxAmount) params.append('max_amount', maxAmount);
            if (selectedProjectId !== 'all') params.append('project_id', selectedProjectId);

            // New Params
            if (trnType && trnType !== 'ALL') params.append('trn_type', trnType);
            if (validationStatus && validationStatus !== 'ALL') params.append('validation_status', validationStatus);

            const response = await api.get(`/ofx/transactions?${params.toString()}`);
            setDbTransactions(response.data.data);
            setTotalItems(response.data.total);
            setTotalStats(response.data.stats);
        } catch (error) {
            console.error("Erro ao carregar transações do banco:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // Trigger search when filtering states change (reset to page 1)
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchDbTransactions(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, dateStart, dateEnd, minAmount, maxAmount, selectedProjectId, trnType, validationStatus]);

    // Independent effect for page changes
    useEffect(() => {
        fetchDbTransactions(page);
    }, [page]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (uploadedFile) {
            setIsSaving(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const content = event.target?.result as string;
                    const parsed = parseOFX(content);

                    if (parsed.transactions.length > 0) {
                        const sortedTxs = [...parsed.transactions].sort((a, b) =>
                            new Date(b.dt_posted).getTime() - new Date(a.dt_posted).getTime()
                        );

                        let currentBalance = parsed.ledger_balance;

                        const payload = sortedTxs.map((tx: any) => {
                            const txWithBalance = {
                                bank_id: parsed.bank_id,
                                acct_id: parsed.acct_id,
                                trn_type: tx.trn_type,
                                dt_posted: tx.dt_posted,
                                amount: tx.amount,
                                fitid: tx.fitid,
                                check_num: tx.check_num,
                                memo: tx.memo,
                                balance: currentBalance
                            };

                            currentBalance = currentBalance - tx.amount;
                            return txWithBalance;
                        });

                        await api.post('/ofx/upload', payload);
                        alert("Arquivo importado e salvo com sucesso!");
                        setPage(1);
                        fetchDbTransactions(1);
                    }
                } catch (error) {
                    console.error("Erro ao importar arquivo:", error);
                    alert("Erro ao importar arquivo OFX.");
                } finally {
                    setIsSaving(false);
                }
            };
            reader.readAsText(uploadedFile, 'ISO-8859-1');
        }
    };

    const handleAssociate = async (txId: number, projectId: string) => {
        try {
            await api.put(`/ofx/transactions/${txId}/associate`, { project_id: projectId });
            setDbTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, project_id: projectId === 'unlinked' ? null : projectId } : tx));
            fetchDbTransactions(page);
        } catch (error) {
            console.error("Erro ao associar:", error);
        }
    };

    const runAutoMatch = async () => {
        setIsAutoMatching(true);
        try {
            const res = await api.post('/ofx/auto-match');
            alert(`${res.data.matched_count} transações associadas automaticamente!`);
            fetchDbTransactions(page);
        } catch (error) {
            console.error("Erro no auto-match:", error);
        } finally {
            setIsAutoMatching(false);
        }
    };

    const runValidation = async () => {
        setIsValidating(true);
        try {
            await api.post('/ofx/validate');
            alert("Validação cruzada concluída!");
            fetchDbTransactions(page);
        } catch (error) {
            console.error("Erro na validação:", error);
        } finally {
            setIsValidating(false);
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
            <AuditoriaHeader
                onFileUpload={handleFileUpload}
                isSaving={isSaving}
                isAutoMatching={isAutoMatching}
                isValidating={isValidating}
                onAutoMatch={runAutoMatch}
                onValidate={runValidation}
                hasTransactions={dbTransactions.length > 0}
                accountInfo={{
                    bankId: dbTransactions[0]?.bank_id || '---',
                    accountId: dbTransactions[0]?.acct_id || '---',
                    ledgerBalance: totalStats?.total_sum || 0
                }}
                stats={{
                    totalCredits: 0,
                    totalDebits: 0,
                    initialBalance: 0
                }}
            />

            <AuditoriaFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                dateStart={dateStart}
                onDateStartChange={setDateStart}
                dateEnd={dateEnd}
                onDateEndChange={setDateEnd}
                minAmount={minAmount}
                onMinAmountChange={setMinAmount}
                maxAmount={maxAmount}
                onMaxAmountChange={setMaxAmount}
                trnType={trnType}
                onTrnTypeChange={setTrnType}
                validationStatus={validationStatus}
                onValidationStatusChange={setValidationStatus}
                onProjectIdChange={setSelectedProjectId}
            />

            <AuditoriaTable
                data={dbTransactions}
                projects={projects}
                onAssociate={handleAssociate}
                isSearching={isSearching}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
            />
        </div>
    );
}
