"use client"
// Force rebuild

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
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
            });
        },
    });

    const handleToggle = () => {
        mutation.mutate(!isFinalized);
    };

    return (
        <div className={cn("flex items-center gap-5 px-5 py-3 rounded-lg border transition-all", isFinalized ? "bg-green-50/80 border-green-200" : "bg-amber-50/80 border-amber-200")}>
            <div className="flex items-center gap-3 flex-1">
                {isFinalized ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                    <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                )}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-slate-700">
                            {isFinalized ? "Finalizado" : "Pendente"}
                        </span>
                        {!isFinalized && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4.5 w-4.5 text-amber-600/70 hover:text-amber-700 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-[200px] text-xs">Indica se a execução técnica do projeto foi finalizada.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    {initialFinalizedAt && isFinalized && (
                        <span className="text-xs text-slate-500">
                            {format(new Date(initialFinalizedAt), "dd/MM/yy", { locale: ptBR })}
                            {initialFinalizedBy && ` • ${initialFinalizedBy.split(' ')[0]}`}
                        </span>
                    )}
                </div>
            </div>

            <Button
                onClick={handleToggle}
                disabled={mutation.isPending}
                variant={isFinalized ? "outline" : "default"}
                size="sm"
                className={cn("h-9 text-xs px-5 shrink-0 font-bold", isFinalized ? "border-green-300 text-green-700 hover:bg-green-100" : "bg-amber-600 hover:bg-amber-700")}
            >
                {mutation.isPending ? "..." : isFinalized ? "Reabrir" : "Finalizar"}
            </Button>
        </div>
    );
}



