'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DashboardData } from '@/types';
import { Briefcase, DollarSign, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function DashboardPage() {
    const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['dashboard-summary'],
        queryFn: async () => {
            const res = await api.get('/dashboard/summary');
            return res.data;
        },
        refetchInterval: 30000, // 30 seconds
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-md"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-32 bg-muted animate-pulse rounded mt-2"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="h-[400px] w-full bg-muted animate-pulse rounded-lg"></div>
            </div>
        );
    }

    if (error || !data) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center space-y-2">
                <div className="text-destructive font-medium">Erro ao carregar dados</div>
                <p className="text-muted-foreground text-sm">Verifique sua conexão e tente novamente.</p>
            </div>
        </div>
    );
    
    const { kpis, charts } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Visão Geral</h2>
                <p className="text-muted-foreground">Acompanhe o desempenho financeiro dos projetos.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Projetos</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.total_projects}</div>
                        <p className="text-xs text-muted-foreground mt-1">Projetos ativos no sistema</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(kpis.total_budget)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Previsto em projetos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Realizado Total</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(kpis.total_realized)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Executado até o momento</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
                        <Wallet className={`h-4 w-4 ${kpis.balance < 0 ? 'text-red-500' : 'text-green-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${kpis.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(kpis.balance)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Disponível para execução</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
                <Card className="col-span-7">
                    <CardHeader>
                        <CardTitle>Top Projetos (Orçamento)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.top_projects} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#888888" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `R$${value/1000}k`}
                                    />
                                    <Tooltip 
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ 
                                            backgroundColor: 'hsl(var(--card))', 
                                            borderColor: 'hsl(var(--border))', 
                                            borderRadius: 'var(--radius)' 
                                        }}
                                        cursor={{fill: 'hsl(var(--muted))', opacity: 0.2}}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                        {charts.top_projects.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--primary)/0.8)"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
