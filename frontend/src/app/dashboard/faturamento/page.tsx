'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import {
    Loader2, Receipt, CheckCircle, Clock, FilterX,
    ArrowLeft, Search, TrendingUp, PieChart as PieChartIcon,
    BarChart3, CalendarDays
} from 'lucide-react';
import { useDashboardFilters } from '@/hooks/use-dashboard-filters';
import { Button } from '@/components/ui/button';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

interface FaturamentoItem {
    custo: string;
    projeto_nome: string;
    item: string;
    descricao: string;
    valor: number;
    nota: string | null;
    data_faturamento: string | null;
    data_baixa: string | null;
    status: 'A FATURAR' | 'FATURADO' | 'RECEBIDO';
}

export default function FaturamentoPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectFilter = searchParams.get('project');

    const filters = useDashboardFilters();
    const [data, setData] = useState<FaturamentoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (projectFilter) params.custo = projectFilter;

            if (filters.startDate) {
                params.start_date = filters.startDate.toISOString().split('T')[0].replace(/-/g, '');
            }
            if (filters.endDate) {
                params.end_date = filters.endDate.toISOString().split('T')[0].replace(/-/g, '');
            }

            const response = await api.get('/faturamento/', { params });
            setData(response.data);
        } catch (error) {
            console.error('Erro ao carregar dados de faturamento:', error);
        } finally {
            setLoading(false);
        }
    }, [projectFilter, filters.startDate, filters.endDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        const query = searchQuery.toLowerCase();
        return data.filter(item =>
            item.projeto_nome.toLowerCase().includes(query) ||
            item.custo.toLowerCase().includes(query) ||
            item.descricao.toLowerCase().includes(query) ||
            (item.nota && item.nota.toLowerCase().includes(query))
        );
    }, [data, searchQuery]);

    const stats = useMemo(() => {
        const initial = { total: 0, aFaturar: 0, faturado: 0, recebido: 0 };
        return filteredData.reduce((acc, item) => {
            acc.total += item.valor;
            if (item.status === 'A FATURAR') acc.aFaturar += item.valor;
            if (item.status === 'FATURADO') acc.faturado += item.valor;
            if (item.status === 'RECEBIDO') acc.recebido += item.valor;
            return acc;
        }, initial);
    }, [filteredData]);

    const chartData = useMemo(() => [
        { name: 'A Faturar', value: stats.aFaturar, color: '#f59e0b' },
        { name: 'Faturado', value: stats.faturado, color: '#3b82f6' },
        { name: 'Recebido', value: stats.recebido, color: '#10b981' },
    ], [stats]);

    const trendData = useMemo(() => {
        const months: Record<string, { month: string, aFaturar: number, faturado: number, recebido: number }> = {};

        filteredData.forEach(item => {
            if (!item.data_faturamento) return;
            const monthStr = item.data_faturamento.substring(0, 6); // YYYYMM
            if (!months[monthStr]) {
                const year = monthStr.substring(0, 4);
                const month = monthStr.substring(4, 6);
                months[monthStr] = { month: `${month}/${year}`, aFaturar: 0, faturado: 0, recebido: 0 };
            }

            if (item.status === 'A FATURAR') months[monthStr].aFaturar += item.valor;
            if (item.status === 'FATURADO') months[monthStr].faturado += item.valor;
            if (item.status === 'RECEBIDO') months[monthStr].recebido += item.valor;
        });

        return Object.values(months).sort((a, b) => {
            const [mA, yA] = a.month.split('/');
            const [mB, yB] = b.month.split('/');
            return (parseInt(yA) * 100 + parseInt(mA)) - (parseInt(yB) * 100 + parseInt(mB));
        });
    }, [filteredData]);

    const getStatusBadge = (status: FaturamentoItem['status']) => {
        switch (status) {
            case 'RECEBIDO':
                return (
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200/50 backdrop-blur-sm px-3 py-1 flex gap-1.5 items-center w-fit">
                        <CheckCircle className="h-3.5 w-3.5" /> Recebido
                    </Badge>
                );
            case 'FATURADO':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200/50 backdrop-blur-sm px-3 py-1 flex gap-1.5 items-center w-fit">
                        <Receipt className="h-3.5 w-3.5" /> Faturado
                    </Badge>
                );
            case 'A FATURAR':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200/50 backdrop-blur-sm px-3 py-1 flex gap-1.5 items-center w-fit">
                        <Clock className="h-3.5 w-3.5" /> A Faturar
                    </Badge>
                );
            default:
                return <Badge variant="secondary" className="backdrop-blur-sm">{status}</Badge>;
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr || dateStr.length !== 8) return '-';
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${day}/${month}/${year}`;
    };

    const handleProjectClick = (custo: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('project', custo);
        router.push(`/dashboard/faturamento?${params.toString()}`);
    };

    const clearProjectFilter = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('project');
        router.push(`/dashboard/faturamento?${params.toString()}`);
    };

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 bg-[#f8fafc]">
            {/* Glossy Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-5">
                    {projectFilter && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearProjectFilter}
                            className="h-10 w-10 rounded-xl bg-white hover:bg-white/80 shadow-sm border"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </Button>
                    )}
                    <div>
                        <PageHeader
                            title={projectFilter ? "Faturamento por Projeto" : "Faturamento"}
                            description={projectFilter ? `Análise detalhada do projeto ${projectFilter}` : "Dashboard de faturamento e recebíveis"}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DashboardFilters
                        startDate={filters.startDate}
                        setStartDate={filters.setStartDate}
                        endDate={filters.endDate}
                        setEndDate={filters.setEndDate}
                        clearFilters={filters.clearFilters}
                        timeRange={filters.timeRange}
                        onTimeRangeChange={filters.handleTimeRangeChange}
                    />
                </div>
            </div>

            {/* Visual Analytics Row */}
            <div className="grid gap-6 md:grid-cols-12">
                <Card className="md:col-span-4 border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-sm">
                    <CardHeader className="pb-2 border-b border-gray-100/50">
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500">Distribuição de Status</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[280px] pt-4">
                        {loading ? (
                            <div className="flex h-full items-center justify-center">
                                <Skeleton className="h-32 w-32 rounded-full" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-8 border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-sm">
                    <CardHeader className="pb-2 border-b border-gray-100/50">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500">Tendência Mensal</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[280px] pt-4">
                        {loading ? (
                            <div className="space-y-4 pt-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-[180px] w-full" />
                            </div>
                        ) : trendData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground italic">
                                Sem dados temporais para o período
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis hide />
                                    <RechartsTooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="recebido" fill="#10b981" radius={[4, 4, 0, 0]} name="Recebido" />
                                    <Bar dataKey="faturado" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Faturado" />
                                    <Bar dataKey="aFaturar" fill="#f59e0b" radius={[4, 4, 0, 0]} name="A Faturar" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Metrics Row */}
            <div className="grid gap-6 md:grid-cols-4">
                {[
                    { title: "Volume Total", val: stats.total, color: "text-slate-900", icon: BarChart3 },
                    { title: "Recebido", val: stats.recebido, color: "text-emerald-600", icon: CheckCircle },
                    { title: "Faturado", val: stats.faturado, color: "text-blue-600", icon: Receipt },
                    { title: "A Faturar", val: stats.aFaturar, color: "text-amber-600", icon: Clock },
                ].map((m, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white group cursor-default">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                                    <m.icon className={cn("h-5 w-5", m.color)} />
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-400 border-gray-100">Meta</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.title}</p>
                                <h3 className={cn("text-2xl font-bold tracking-tight", m.color)}>{formatCurrency(m.val)}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table Section */}
            <Card className="border-none shadow-lg overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-white/50 border-b border-gray-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Detalhamento dos Itens
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {filteredData.length} registros encontrados no período
                        </p>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Buscar projeto, nota ou descrição..."
                            className="pl-10 h-10 rounded-xl border-gray-200 focus:ring-primary/20 transition-all bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col h-[300px] items-center justify-center text-muted-foreground gap-3">
                            <FilterX className="h-12 w-12 text-gray-200" />
                            <p className="text-sm font-medium">Nenhum registro encontrado para sua busca.</p>
                            <Button variant="link" onClick={() => setSearchQuery('')} className="text-primary h-auto p-0">Limpar busca</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="font-bold text-gray-600 pl-6">Projeto / Origem</TableHead>
                                        <TableHead className="font-bold text-gray-600">Descrição do Item</TableHead>
                                        <TableHead className="text-right font-bold text-gray-600">Valor</TableHead>
                                        <TableHead className="font-bold text-gray-600">Nota Fiscal</TableHead>
                                        <TableHead className="font-bold text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarDays className="h-3.5 w-3.5" /> Faturado
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-bold text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle className="h-3.5 w-3.5" /> Recebido
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-bold text-gray-600">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((item, index) => (
                                        <TableRow
                                            key={`${item.custo}-${item.item}-${index}`}
                                            className="group hover:bg-slate-50/80 transition-colors border-b border-gray-50 last:border-0"
                                        >
                                            <TableCell className="pl-6 py-4">
                                                <button
                                                    onClick={() => handleProjectClick(item.custo)}
                                                    className="text-left group/link"
                                                >
                                                    <div className="text-[10px] font-bold text-gray-400 group-hover/link:text-primary transition-colors tracking-widest uppercase">
                                                        {item.custo}
                                                    </div>
                                                    <div className="font-semibold text-slate-700 group-hover/link:text-primary transition-colors line-clamp-1 max-w-[200px]">
                                                        {item.projeto_nome}
                                                    </div>
                                                </button>
                                            </TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <div className="text-sm text-slate-600 line-clamp-1" title={item.descricao}>
                                                    {item.descricao}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <span className="font-mono font-bold text-slate-900 tracking-tight">
                                                    {formatCurrency(item.valor)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="font-mono text-sm text-slate-500 bg-slate-100/50 px-2 py-0.5 rounded-md w-fit">
                                                    {item.nota || '---'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500 py-4">
                                                {formatDate(item.data_faturamento)}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500 py-4">
                                                {formatDate(item.data_baixa)}
                                            </TableCell>
                                            <TableCell className="py-4 pr-6">
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
