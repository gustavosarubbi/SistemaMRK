'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

const formSchema = z.object({
  custo: z.string().min(1, "O código é obrigatório").max(50, "Máximo 50 caracteres"),
  descricao: z.string().min(1, "A descrição é obrigatória").max(200, "Máximo 200 caracteres"),
  unidade: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  coordenador: z.string().optional(),
  analista: z.string().optional(),
  departamento: z.string().optional(),
  saldo_inicial: z.number().min(0),
  classe: z.string().min(1),
  bloqueado: z.string().min(1),
});

export default function NewProjectPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema> & { saldo_inicial: number; classe: string; bloqueado: string }>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            custo: "",
            descricao: "",
            unidade: "",
            data_inicio: "",
            data_fim: "",
            coordenador: "",
            analista: "",
            departamento: "",
            saldo_inicial: 0,
            classe: "2",
            bloqueado: "2",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema> & { saldo_inicial: number; classe: string; bloqueado: string }) {
        setIsSubmitting(true);
        try {
            await api.post('/projects/', values);
            toast({
                title: "Projeto criado!",
                description: "O novo projeto foi cadastrado com sucesso.",
            });
            router.push('/dashboard/projects');
        } catch (error: any) {
            console.error(error);
            toast({
                type: "error",
                title: "Erro ao criar projeto",
                description: error.response?.data?.detail || "Ocorreu um erro inesperado.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Novo Projeto"
                description="Cadastre um novo centro de custo/projeto"
                breadcrumbItems={[
                    { label: 'Projetos', href: '/dashboard/projects' },
                    { label: 'Novo Projeto' }
                ]}
            />

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Dados do Projeto</CardTitle>
                    <CardDescription>
                        Preencha as informações conforme estrutura do sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="custo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Código (Custo)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: 102030" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <FormField
                                    control={form.control}
                                    name="classe"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Classe</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="1">1 - Sintético</SelectItem>
                                                    <SelectItem value="2">2 - Analítico</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bloqueado"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="2">Ativo</SelectItem>
                                                    <SelectItem value="1">Bloqueado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="descricao"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome do projeto..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="departamento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Departamento</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Departamento responsável" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unidade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Unidade (Filial)" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="coordenador"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Coordenador</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do coordenador" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="analista"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Analista</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do analista" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="data_inicio"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data Início</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="data_fim"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data Fim</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="saldo_inicial"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Saldo Inicial</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    placeholder="0.00" 
                                                    {...field}
                                                    value={field.value ?? 0}
                                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Salvar Projeto
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
