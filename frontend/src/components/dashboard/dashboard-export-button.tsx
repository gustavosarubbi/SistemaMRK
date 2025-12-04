"use client"

import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardData } from "@/types";
import { useState } from "react";
import { exportDashboardData } from "@/lib/export-utils";

interface DashboardExportButtonProps {
    data: DashboardData | undefined;
}

export function DashboardExportButton({ data }: DashboardExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    
    const handleExport = async (format: 'pdf' | 'excel', type: 'kpis' | 'projects' | 'full') => {
        if (!data) return;
        
        setIsExporting(true);
        try {
            await exportDashboardData(data, format, type);
        } catch (error) {
            console.error('Erro ao exportar:', error);
        } finally {
            setIsExporting(false);
        }
    };
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting || !data}>
                    {isExporting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Exportando...
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Exportar Dashboard</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    KPIs e Resumo
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('pdf', 'kpis')}>
                    <FileText className="h-4 w-4 mr-2" />
                    KPIs (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel', 'kpis')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    KPIs (Excel)
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Projetos
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('pdf', 'projects')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Projetos em Execução (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel', 'projects')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Projetos em Execução (Excel)
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => handleExport('pdf', 'full')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Relatório Completo (PDF)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

