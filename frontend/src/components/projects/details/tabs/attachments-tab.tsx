'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, File, Download, Trash2, FolderOpen } from 'lucide-react';
import { ProjectAttachment } from '@/types';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AttachmentsTabProps {
    projectId: string;
}

const CATEGORY_LABELS: Record<ProjectAttachment['category'], string> = {
    contract: 'Contratos',
    invoice: 'Notas Fiscais',
    report: 'Relatórios',
    other: 'Outros',
};

const CATEGORY_COLORS: Record<ProjectAttachment['category'], string> = {
    contract: 'bg-blue-100 text-blue-700 border-blue-200',
    invoice: 'bg-green-100 text-green-700 border-green-200',
    report: 'bg-purple-100 text-purple-700 border-purple-200',
    other: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function AttachmentsTab({ projectId }: AttachmentsTabProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<ProjectAttachment['category']>('other');
    const [isDragging, setIsDragging] = useState(false);

    // Fetch attachments
    const { data: attachments = [], isLoading } = useQuery<ProjectAttachment[]>({
        queryKey: ['project_attachments', projectId],
        queryFn: async () => {
            try {
                const res = await api.get(`/projects/${projectId}/attachments`);
                return res.data || [];
            } catch (error) {
                console.error('Erro ao carregar anexos:', error);
                return [];
            }
        },
    });

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async ({ file, category }: { file: File; category: ProjectAttachment['category'] }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            const res = await api.post(`/projects/${projectId}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_attachments', projectId] });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/projects/${projectId}/attachments/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_attachments', projectId] });
        },
    });

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
            uploadMutation.mutate({ file, category: selectedCategory });
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDelete = (id: string, filename: string) => {
        if (confirm(`Tem certeza que deseja excluir o arquivo "${filename}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const attachmentsByCategory = attachments.reduce((acc, att) => {
        if (!acc[att.category]) {
            acc[att.category] = [];
        }
        acc[att.category].push(att);
        return acc;
    }, {} as Record<ProjectAttachment['category'], ProjectAttachment[]>);

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Anexo</CardTitle>
                    <CardDescription>Faça upload de documentos relacionados ao projeto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ProjectAttachment['category'])}>
                        <SelectTrigger>
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                            "hover:border-primary/50 cursor-pointer"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">
                            Arraste arquivos aqui ou clique para selecionar
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Suporta múltiplos arquivos
                        </p>
                        <Input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileSelect(e.target.files)}
                        />
                    </div>

                    {uploadMutation.isPending && (
                        <div className="text-sm text-muted-foreground text-center">
                            Enviando arquivo(s)...
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attachments List */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                            Carregando anexos...
                        </div>
                    </div>
                ) : attachments.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">Nenhum anexo adicionado ainda.</p>
                        </CardContent>
                    </Card>
                ) : (
                    Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                        const categoryAttachments = attachmentsByCategory[category as ProjectAttachment['category']] || [];
                        if (categoryAttachments.length === 0) return null;

                        return (
                            <Card key={category}>
                                <CardHeader>
                                    <CardTitle className="text-base">{label}</CardTitle>
                                    <CardDescription>
                                        {categoryAttachments.length} {categoryAttachments.length === 1 ? 'arquivo' : 'arquivos'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {categoryAttachments.map((att) => (
                                            <div
                                                key={att.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <File className="h-5 w-5 text-muted-foreground shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{att.filename}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatFileSize(att.size)}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">•</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {format(new Date(att.uploaded_at), "dd/MM/yyyy", { locale: ptBR })}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">•</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {att.uploaded_by}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(att.url, '_blank')}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(att.id, att.filename)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}

