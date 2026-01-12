"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AuditoriaStatsProps {
    stats: {
        total: number;
        validated: number;
        discrepancies: number;
        associated: number;
    };
    totalSum: number;
}

export const AuditoriaStats: React.FC<AuditoriaStatsProps> = ({ stats, totalSum }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-white">
                <CardContent className="p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Salvos no Banco</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
            </Card>
            <Card className="bg-white">
                <CardContent className="p-4">
                    <p className="text-xs font-semibold text-emerald-500 uppercase">Validados</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.validated}</p>
                </CardContent>
            </Card>
            <Card className="bg-white">
                <CardContent className="p-4">
                    <p className="text-xs font-semibold text-rose-500 uppercase">Divergentes</p>
                    <p className="text-2xl font-bold text-rose-600">{stats.discrepancies}</p>
                </CardContent>
            </Card>
            <Card className="bg-white">
                <CardContent className="p-4">
                    <p className="text-xs font-semibold text-blue-500 uppercase">Associados</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.associated}</p>
                </CardContent>
            </Card>
            <Card className="bg-indigo-600 text-white">
                <CardContent className="p-4">
                    <p className="text-xs font-semibold opacity-80 uppercase">Soma (Filtro)</p>
                    <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSum)}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
