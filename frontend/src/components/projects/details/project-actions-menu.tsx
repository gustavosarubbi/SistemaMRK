'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Printer, Share2, FileText, Paperclip } from 'lucide-react';

interface ProjectActionsMenuProps {
    projectId: string;
    onAddNote?: () => void;
    onAddAttachment?: () => void;
}

export function ProjectActionsMenu({ projectId, onAddNote, onAddAttachment }: ProjectActionsMenuProps) {
    const router = useRouter();

    const handleEdit = () => {
        router.push(`/dashboard/projects/${projectId}/edit`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            // TODO: Adicionar toast de sucesso
        } catch (err) {
            console.error('Erro ao copiar link:', err);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Projeto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Relatório
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onAddNote}>
                    <FileText className="h-4 w-4 mr-2" />
                    Adicionar Nota
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddAttachment}>
                    <Paperclip className="h-4 w-4 mr-2" />
                    Adicionar Anexo
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}






