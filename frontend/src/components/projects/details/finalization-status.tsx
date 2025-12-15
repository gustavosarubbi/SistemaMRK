"use client"

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface FinalizationStatusProps {
    projectId: string;
    isFinalized?: boolean;
    finalizedAt?: string;
    finalizedBy?: string;
}

export function FinalizationStatus({ 
    projectId, 
    isFinalized: initialIsFinalized = false,
    finalizedAt: initialFinalizedAt,
    finalizedBy: initialFinalizedBy
}: FinalizationStatusProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isFinalized, setIsFinalized] = useState(initialIsFinalized);

    const mutation = useMutation({
        mutationFn: async (finalized: boolean) => {
            const res = await api.put(`/projects/${projectId}/finalization-status`, {
                is_finalized: finalized
            });
            return res.data;
        },
        onSuccess: (data) => {
            setIsFinalized(data.is_finalized);
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            toast({
                title: "Status atualizado",
                description: data.is_finalized 
                    ? "Projeto marcado como finalizado" 
                    : "Projeto marcado como pendente (ainda presta contas)",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro",
                description: error.response?.data?.detail || "Erro ao atualizar status",
                variant: "destructive",
            });
        },
    });

    const handleToggle = () => {
        mutation.mutate(!isFinalized);
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Status de Finalização</CardTitle>
                <CardDescription className="text-xs mt-1">
                    Valide se o projeto ainda presta contas ou já foi finalizado
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        {isFinalized ? (
                            <>
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                <div className="space-y-1.5">
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        Finalizado
                                    </Badge>
                                    {initialFinalizedAt && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Finalizado em {format(new Date(initialFinalizedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    )}
                                    {initialFinalizedBy && (
                                        <p className="text-xs text-muted-foreground">
                                            por {initialFinalizedBy}
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Clock className="h-6 w-6 text-amber-600" />
                                <div className="space-y-1.5">
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        Pendente
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Projeto ainda presta contas finais
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                <Button
                    onClick={handleToggle}
                    disabled={mutation.isPending}
                    variant={isFinalized ? "outline" : "default"}
                    size="sm"
                    className="w-full"
                >
                    {mutation.isPending ? (
                        "Atualizando..."
                    ) : isFinalized ? (
                        <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Marcar como Pendente
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Marcar como Finalizado
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}



