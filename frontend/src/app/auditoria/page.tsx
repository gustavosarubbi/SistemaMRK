import { ShieldCheck, Calendar, Filter, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AuditoriaPage() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
            {/* Header com Design Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Auditoria de Dados</h1>
                    </div>
                    <p className="text-slate-500 max-w-2xl">
                        Rastreamento completo e histórico de alterações em registros críticos do sistema, garantindo integridade e conformidade.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Últimos 30 dias
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
                        <Download className="h-4 w-4" />
                        Exportar Relatório
                    </Button>
                </div>
            </div>

            {/* Filtros e Busca */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por ID, usuário ou tipo de evento..."
                            className="pl-9 border-slate-200 focus:border-indigo-300 focus:ring-indigo-100"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button variant="outline" size="sm" className="gap-2 text-slate-600">
                            <Filter className="h-4 w-4" />
                            Filtrar por Entidade
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 text-slate-600">
                            <Filter className="h-4 w-4" />
                            Filtrar por Ação
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Empty State / Placeholder */}
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md p-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Nenhum registro de auditoria encontrado</h3>
                    <p className="text-slate-500">
                        O banco de dados de auditoria está conectado, mas ainda não há registros. As ações realizadas no sistema começarão a aparecer aqui.
                    </p>
                    <Button variant="outline" className="mt-4">
                        Configurar Parâmetros
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">Total de Eventos</h4>
                    <span className="text-3xl font-bold text-slate-900">0</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">Entidades Monitoradas</h4>
                    <span className="text-3xl font-bold text-slate-900">0</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">Usuários Ativos</h4>
                    <span className="text-3xl font-bold text-slate-900">0</span>
                </div>
            </div>
        </div>
    );
}
