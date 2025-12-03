'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { validationApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  DollarSign,
  Calendar,
  User,
  Building2,
  TrendingUp,
  Edit,
  Tag,
  Briefcase,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { EditModal } from '@/components/validation/edit-modal';
import { RejectModal } from '@/components/validation/reject-modal';
import { PageHeader } from '@/components/layout/page-header';
import { getProjectClassification, getServiceType } from '@/lib/project-mappings';

export default function ProjectValidationPage() {
  const params = useParams();
  const router = useRouter();
  const custo = params.id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRecordId, setRejectRecordId] = useState<string>('');
  const [rejectTable, setRejectTable] = useState<string>('');

  // Fetch project with all related data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['validation-project', custo],
    queryFn: async () => {
      const res = await validationApi.getProjectForValidation(custo);
      return res.data;
    },
    retry: 1, // Limita retries para evitar loops infinitos
    refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
  });

  // Approve all mutation
  const approveAllMutation = useMutation({
    mutationFn: async () => {
      return await validationApi.approveProjectAll(custo);
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Projeto e todos os registros relacionados foram aprovados e migrados',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['validation-project', custo] });
      queryClient.invalidateQueries({ queryKey: ['validation-records'] });
      queryClient.invalidateQueries({ queryKey: ['validation-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.response?.data?.detail || 'Erro ao aprovar projeto',
        type: 'error',
      });
    },
  });

  const handleEdit = (record: any, table: string) => {
    setSelectedRecord({ ...record, _table: table });
    setEditModalOpen(true);
  };

  const handleApprove = async (recordId: string, table: string) => {
    if (confirm('Tem certeza que deseja aprovar este registro?')) {
      try {
        await validationApi.approveRecord(table, recordId);
        toast({
          title: 'Sucesso',
          description: 'Registro aprovado com sucesso',
          type: 'success',
        });
        refetch();
        queryClient.invalidateQueries({ queryKey: ['validation-stats'] });
      } catch (error: any) {
        toast({
          title: 'Erro',
          description: error.response?.data?.detail || 'Erro ao aprovar registro',
          type: 'error',
        });
      }
    }
  };

  const handleReject = (recordId: string, table: string) => {
    setRejectRecordId(recordId);
    setRejectTable(table);
    setRejectModalOpen(true);
  };

  const handleSuccess = () => {
    refetch();
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro ao carregar projeto</p>
                <p className="text-sm text-muted-foreground mt-1">Tente novamente em alguns instantes</p>
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = data.project;
  const movements = data.movements || [];
  const budgets = data.budgets || [];
  const summary = data.summary || {};

  const projectStatus = project.validation_status?.status || 'PENDING';
  const pendingMovements = movements.filter((m: any) => m.validation_status?.status === 'PENDING').length;
  const pendingBudgets = budgets.filter((b: any) => b.validation_status?.status === 'PENDING').length;
  const canApproveAll = projectStatus === 'PENDING' && (pendingMovements > 0 || pendingBudgets > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Validação do Projeto"
          description={`${project.CTT_CUSTO} - ${project.CTT_DESC01 || 'Sem descrição'}`}
          breadcrumbItems={[
            { label: 'Validação', href: '/dashboard/validation' },
            { label: 'Validação do Projeto' }
          ]}
        />
        {canApproveAll && (
          <Button
            onClick={() => {
              if (confirm('Tem certeza que deseja aprovar o projeto e TODOS os registros relacionados? Esta ação não pode ser desfeita.')) {
                approveAllMutation.mutate();
              }
            }}
            disabled={approveAllMutation.isPending}
            size="lg"
          >
            {approveAllMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aprovando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar Tudo
              </>
            )}
          </Button>
        )}
      </div>

      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informações do Projeto</CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(projectStatus)}
              {projectStatus === 'PENDING' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(project, 'CTT010')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Código de Custo
              </div>
              <div className="font-semibold">{project.CTT_CUSTO}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Período
              </div>
              <div className="font-semibold">
                {formatDate(project.CTT_DTINI)} até {formatDate(project.CTT_DTFIM)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                Coordenador
              </div>
              <div className="font-semibold">{project.CTT_NOMECO || '-'}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Cliente
              </div>
              <div className="font-semibold">{project.CTT_UNIDES || '-'}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                Classificação
              </div>
              <div className="font-semibold">{getProjectClassification(project.CTT_CLAPRJ)}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                Tipo Prestação
              </div>
              <div className="font-semibold">{getServiceType(project.CTT_TPCONV)}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                Analista
              </div>
              <div className="font-semibold">{project.CTT_ANADES || project.CTT_ANALIS || '-'}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Saldo Inicial
              </div>
              <div className="font-semibold">{formatCurrency(project.CTT_SALINI || 0)}</div>
            </div>
          </div>
          {projectStatus === 'PENDING' && (
            <div className="mt-6 flex gap-2">
              <Button
                onClick={() => handleApprove(project.CTT_CUSTO, 'CTT010')}
                variant="default"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar Projeto
              </Button>
              <Button
                onClick={() => handleReject(project.CTT_CUSTO, 'CTT010')}
                variant="destructive"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar Projeto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_movements || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.movements_count || 0} registros
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_budget || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.budgets_count || 0} registros
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_realized || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingMovements + pendingBudgets}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {pendingMovements} mov. + {pendingBudgets} orç.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações (PAC010)</CardTitle>
          <CardDescription>
            {movements.length} movimentações relacionadas a este projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((mov: any) => {
                    const movId = String(mov.R_E_C_N_O_);
                    const movStatus = mov.validation_status?.status || 'PENDING';
                    const isPending = movStatus === 'PENDING';

                    return (
                      <TableRow key={movId}>
                        <TableCell className="font-semibold text-xs">{movId}</TableCell>
                        <TableCell className="text-xs">{formatDate(mov.PAC_DATA)}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          {formatCurrency(mov.PAC_VALOR || 0)}
                        </TableCell>
                        <TableCell className="text-xs">{mov.PAC_HISTOR || '-'}</TableCell>
                        <TableCell className="text-xs">{mov.PAC_TIPO || '-'}</TableCell>
                        <TableCell>{getStatusBadge(movStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(mov, 'PAC010')}
                                  title="Editar"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove(movId, 'PAC010')}
                                  title="Aprovar"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleReject(movId, 'PAC010')}
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
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orçamentos (PAD010)</CardTitle>
          <CardDescription>
            {budgets.length} orçamentos relacionados a este projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Orçado</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum orçamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  budgets.map((budget: any) => {
                    const budgetId = String(budget.R_E_C_N_O_);
                    const budgetStatus = budget.validation_status?.status || 'PENDING';
                    const isPending = budgetStatus === 'PENDING';

                    return (
                      <TableRow key={budgetId}>
                        <TableCell className="font-semibold text-xs">{budgetId}</TableCell>
                        <TableCell className="text-xs">{budget.PAD_DESCRI || '-'}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(budget.PAD_ORCADO || 0)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(budget.PAD_REALIZ || 0)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(budget.PAD_SALDO || 0)}
                        </TableCell>
                        <TableCell>{getStatusBadge(budgetStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(budget, 'PAD010')}
                                  title="Editar"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove(budgetId, 'PAD010')}
                                  title="Aprovar"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleReject(budgetId, 'PAD010')}
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
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedRecord && (
        <EditModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedRecord(null);
          }}
          table={selectedRecord._table}
          record={selectedRecord}
          onSuccess={handleSuccess}
        />
      )}

      <RejectModal
        open={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectRecordId('');
          setRejectTable('');
        }}
        table={rejectTable}
        recordId={rejectRecordId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

