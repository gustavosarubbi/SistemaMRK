'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';

interface ExportButtonProps {
    movements: any[];
    projectName: string;
    projectCode: string;
    formatDate: (dateStr: string) => string;
}

export function ExportButton({ movements, projectName, projectCode, formatDate }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const exportToCSV = () => {
        setIsExporting(true);
        try {
            const headers = ['Data', 'Histórico', 'Tipo', 'Documento', 'Valor'];
            const rows = movements.map(m => [
                formatDate(m.PAC_DATA),
                m.PAC_HISTOR || '',
                m.PAC_TIPO || '',
                m.PAC_DOCUME || '',
                m.PAC_VALOR || 0
            ]);

            const csv = [
                headers.join(';'),
                ...rows.map(row => row.join(';'))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `movimentacoes_${projectCode}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const exportToXLSX = () => {
        setIsExporting(true);
        try {
            const data = movements.map(m => ({
                'Data': formatDate(m.PAC_DATA),
                'Histórico': m.PAC_HISTOR || '',
                'Tipo': m.PAC_TIPO || '',
                'Documento': m.PAC_DOCUME || '',
                'Valor': m.PAC_VALOR || 0
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');
            XLSX.writeFile(wb, `movimentacoes_${projectCode}.xlsx`);
        } catch (error) {
            console.error('Erro ao exportar XLSX:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = () => {
        setIsExporting(true);
        try {
            const doc = new jsPDF();
            
            // Título
            doc.setFontSize(16);
            doc.text(`Movimentações - ${projectName}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Código: ${projectCode}`, 14, 27);
            doc.text(`Total de registros: ${movements.length}`, 14, 32);

            // Tabela
            const tableData = movements.map(m => [
                formatDate(m.PAC_DATA),
                (m.PAC_HISTOR || '').substring(0, 40),
                m.PAC_TIPO || '',
                m.PAC_DOCUME || '',
                formatCurrency(m.PAC_VALOR || 0)
            ]);

            autoTable(doc, {
                head: [['Data', 'Histórico', 'Tipo', 'Documento', 'Valor']],
                body: tableData,
                startY: 40,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 66, 66] },
            });

            doc.save(`movimentacoes_${projectCode}.pdf`);
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting || movements.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exportando...' : 'Exportar'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToXLSX} disabled={isExporting}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} disabled={isExporting}>
                    <File className="h-4 w-4 mr-2" />
                    Exportar PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}






