'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Clock, Edit2, Trash2, Save, X } from 'lucide-react';
import { ProjectNote } from '@/types';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    getNotesFromStorage,
    saveNoteToStorage,
    deleteNoteFromStorage,
} from '@/lib/localStorage-utils';

interface NotesTabProps {
    projectId: string;
}

export function NotesTab({ projectId }: NotesTabProps) {
    const queryClient = useQueryClient();
    const [newNote, setNewNote] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');

    // Fetch notes
    const { data: notes = [], isLoading } = useQuery<ProjectNote[]>({
        queryKey: ['project_notes', projectId],
        queryFn: async () => {
            try {
                const res = await api.get(`/projects/${projectId}/notes`);
                const apiNotes = res.data || [];
                
                // Sincronizar com localStorage
                const storageNotes = getNotesFromStorage(projectId);
                const allNotes = [...apiNotes];
                
                // Adicionar notas do localStorage que não estão na API
                storageNotes.forEach((storageNote) => {
                    if (!allNotes.find((n) => n.id === storageNote.id)) {
                        allNotes.push(storageNote);
                    }
                });
                
                return allNotes;
            } catch (error) {
                console.warn('Erro ao carregar notas da API, usando localStorage:', error);
                // Fallback para localStorage
                return getNotesFromStorage(projectId);
            }
        },
    });

    // Create note mutation
    const createMutation = useMutation({
        mutationFn: async (content: string) => {
            const noteId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();
            
            const newNote: ProjectNote = {
                id: noteId,
                project_id: projectId,
                content,
                author: 'Usuário', // TODO: pegar do auth store
                created_at: now,
            };
            
            try {
                const res = await api.post(`/projects/${projectId}/notes`, { content });
                const savedNote = res.data;
                // Salvar no localStorage também
                saveNoteToStorage(projectId, savedNote);
                return savedNote;
            } catch (error) {
                console.warn('Erro ao criar nota na API, salvando no localStorage:', error);
                // Fallback: salvar no localStorage
                saveNoteToStorage(projectId, newNote);
                return newNote;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_notes', projectId] });
            setNewNote('');
        },
    });

    // Update note mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, content }: { id: string; content: string }) => {
            const existingNotes = getNotesFromStorage(projectId);
            const existingNote = existingNotes.find((n) => n.id === id);
            
            const updatedNote: ProjectNote = {
                ...existingNote!,
                id,
                content,
                updated_at: new Date().toISOString(),
            };
            
            try {
                const res = await api.put(`/projects/${projectId}/notes/${id}`, { content });
                const savedNote = res.data;
                // Salvar no localStorage também
                saveNoteToStorage(projectId, savedNote);
                return savedNote;
            } catch (error) {
                console.warn('Erro ao atualizar nota na API, salvando no localStorage:', error);
                // Fallback: salvar no localStorage
                saveNoteToStorage(projectId, updatedNote);
                return updatedNote;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_notes', projectId] });
            setEditingId(null);
            setEditingContent('');
        },
    });

    // Delete note mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            try {
                await api.delete(`/projects/${projectId}/notes/${id}`);
            } catch (error) {
                console.warn('Erro ao deletar nota na API, deletando do localStorage:', error);
            } finally {
                // Sempre deletar do localStorage também
                deleteNoteFromStorage(projectId, id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_notes', projectId] });
        },
    });

    const handleCreate = () => {
        if (newNote.trim()) {
            createMutation.mutate(newNote.trim());
        }
    };

    const handleStartEdit = (note: ProjectNote) => {
        setEditingId(note.id);
        setEditingContent(note.content);
    };

    const handleSaveEdit = () => {
        if (editingId && editingContent.trim()) {
            updateMutation.mutate({ id: editingId, content: editingContent.trim() });
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingContent('');
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta nota?')) {
            deleteMutation.mutate(id);
        }
    };

    const sortedNotes = [...notes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
        <div className="space-y-6">
            {/* Add Note Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Nota</CardTitle>
                    <CardDescription>Registre observações e informações importantes sobre o projeto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Digite sua nota aqui..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={4}
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={handleCreate}
                            disabled={!newNote.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Salvando...' : 'Adicionar Nota'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Notes Timeline */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Notas ({notes.length})</h3>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                            Carregando notas...
                        </div>
                    </div>
                ) : sortedNotes.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">Nenhuma nota registrada ainda.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sortedNotes.map((note) => (
                            <Card key={note.id}>
                                <CardContent className="pt-6">
                                    {editingId === note.id ? (
                                        <div className="space-y-4">
                                            <Textarea
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                rows={4}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCancelEdit}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveEdit}
                                                    disabled={!editingContent.trim() || updateMutation.isPending}
                                                >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Salvar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleStartEdit(note)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(note.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    <span>{note.author}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>
                                                        {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                {note.updated_at && note.updated_at !== note.created_at && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Editado
                                                    </Badge>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


