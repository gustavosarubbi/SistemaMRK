'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { validationApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EditModal } from '@/components/validation/edit-modal';
import { RejectModal } from '@/components/validation/reject-modal';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { getProjectClassification, getServiceType } from '@/lib/project-mappings';

const TABLES = [
  { value: 'CTT010', label: 'Projetos (CTT010)' },
  { value: 'PAC010', label: 'Movimentações (PAC010)' },
  { value: 'PAD010', label: 'Orçamentos (PAD010)' },
];

export default function ValidationPage() {
  const router = useRouter();
  const [activeTable, setActiveTable] = useState('CTT010');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRecordId, setRejectRecordId] = useState<string>('');
  const limit = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['validation-stats'],
    queryFn: async () => {
      const res = await validationApi.getStats();
      return res.data;
    },
    retry: 1, // Limita retries para evitar loops infinitos
    refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
  });

  // Fetch records
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['validation-records', activeTable, page, search, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await validationApi.listRecords(activeTable, params);
      return res.data;
    },
    retry: 1, // Limita retries para evitar loops infinitos
    refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (recordId: string) => {
      return await validationApi.approveRecord(activeTable, recordId);
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Registro aprovado e migrado com sucesso',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['validation-records'] });
      queryClient.invalidateQueries({ queryKey: ['validation-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.response?.data?.detail || 'Erro ao aprovar registro',
        type: 'error',
      });
    },
  });

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setEditModalOpen(true);
  };

  const handleApprove = async (recordId: string) => {
    if (confirm('Tem certeza que deseja aprovar este registro? Ele será migrado para o banco validado.')) {
      approveMutation.mutate(recordId);
    }
  };

  const handleReject = (recordId: string) => {
    setRejectRecordId(recordId);
    setRejectModalOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['validation-records'] });
    queryClient.invalidateQueries({ queryKey: ['validation-stats'] });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return '-';
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">Aprovado</Badge>;
      case 'REJECTED':
        return <Badge variant="critical">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getRecordId = (record: any) => {
    return record.CTT_CUSTO || record.R_E_C_N_O_;
  };

  const getTableStats = () => {
    if (!stats || !stats[activeTable]) return { pending: 0, approved: 0, rejected: 0 };
    return stats[activeTable];
  };

  const tableStats = getTableStats();
  const records = data?.data || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Validação de Dados"
        description="Valide e migre dados do banco local para o banco validado"
        breadcrumbItems={[{ label: 'Validação' }]}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{tableStats.pending}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{tableStats.approved}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{tableStats.rejected}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar registros..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <div className="relative min-w-[180px] max-w-[220px]">
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Status</label>
              <select
                value={statusFilter || ''}
                onChange={(e) => {
                  setStatusFilter(e.target.value || undefined);
                  setPage(1);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            </div>
            {(search || statusFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter(undefined);
                  setPage(1);
                }}
                className="h-9 text-sm"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table Tabs */}
      <Card className="overflow-hidden">
        <Tabs value={activeTable} onValueChange={(value) => {
          setActiveTable(value);
          setPage(1);
          setSearch('');
          setStatusFilter(undefined);
        }}>
          <div className="p-4 border-b">
            <TabsList>
              {TABLES.map((table) => (
                <TabsTrigger key={table.value} value={table.value}>
                  {table.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {TABLES.map((table) => (
            <TabsContent key={table.value} value={table.value} className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      {activeTable === 'CTT010' && (
                        <>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Classificação</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Coordenador</TableHead>
                        </>
                      )}
                      {activeTable === 'PAC010' && (
                        <>
                          <TableHead>Custo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Histórico</TableHead>
                        </>
                      )}
                      {activeTable === 'PAD010' && (
                        <>
                          <TableHead>Custo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Orçado</TableHead>
                          <TableHead>Realizado</TableHead>
                        </>
                      )}
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-3 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-3 py-4">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                            <div>
                              <p className="font-medium text-destructive">Erro ao carregar registros</p>
                              <p className="text-sm text-muted-foreground mt-1">Tente novamente em alguns instantes</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                              Tentar novamente
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : records.length > 0 ? (
                      records.map((record: any) => {
                        const recordId = getRecordId(record);
                        const valStatus = record.validation_status?.status || 'PENDING';
                        const isPending = valStatus === 'PENDING';

                        return (
                          <TableRow key={recordId} className="group">
                            <TableCell className="font-semibold text-xs">
                              {recordId}
                            </TableCell>
                            {activeTable === 'CTT010' && (
                              <>
                                <TableCell className="text-xs">
                                  {record.CTT_DESC01 || '-'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {record.CTT_UNIDES || '-'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {getProjectClassification(record.CTT_CLAPRJ)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {getServiceType(record.CTT_TPCONV)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {record.CTT_NOMECO || '-'}
                                </TableCell>
                              </>
                            )}
                            {activeTable === 'PAC010' && (
                              <>
                                <TableCell className="text-xs">
                                  {record.PAC_CUSTO || '-'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {formatDate(record.PAC_DATA)}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  {formatCurrency(record.PAC_VALOR || 0)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {record.PAC_HISTOR || '-'}
                                </TableCell>
                              </>
                            )}
                            {activeTable === 'PAD010' && (
                              <>
                                <TableCell className="text-xs">
                                  {record.PAD_CUSTO || '-'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {record.PAD_DESCRI || '-'}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  {formatCurrency(record.PAD_ORCADO || 0)}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  {formatCurrency(record.PAD_REALIZ || 0)}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              {getStatusBadge(valStatus)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {activeTable === 'CTT010' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => router.push(`/dashboard/validation/project/${recordId}`)}
                                    title="Ver Detalhes"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(record)}
                                  title="Editar"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                {isPending && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleApprove(recordId)}
                                      disabled={approveMutation.isPending}
                                      title="Aprovar"
                                    >
                                      {approveMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleReject(recordId)}
                                      title="Rejeitar"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-3 py-8">
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                            <div>
                              <p className="font-medium text-foreground">Nenhum registro encontrado</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {search || statusFilter
                                  ? 'Tente ajustar os filtros selecionados'
                                  : 'Não há registros para validar no momento'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {records.length > 0 && (
                <div className="border-t bg-muted/30 px-4 py-3">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Modals */}
      {selectedRecord && (
        <EditModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedRecord(null);
          }}
          table={activeTable}
          record={selectedRecord}
          onSuccess={handleSuccess}
        />
      )}

      <RejectModal
        open={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectRecordId('');
        }}
        table={activeTable}
        recordId={rejectRecordId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

