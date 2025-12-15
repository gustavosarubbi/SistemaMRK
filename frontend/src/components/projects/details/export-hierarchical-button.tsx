'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HierarchicalItem {
    id: string;
    name: string;
    value: number;
    count: number;
    isMother: boolean;
    motherId?: string;
    level: number;
    dates?: string[];
    category?: string;
    emissao?: string;
    baixa?: string;
}

interface ExportHierarchicalButtonProps {
    data: HierarchicalItem[];
    childrenByMother: Record<string, HierarchicalItem[]>;
    grandchildrenByChild: Record<string, HierarchicalItem[]>;
    projectName: string;
    projectCode: string;
    type: 'gastos' | 'movimentacoes';
}

type ExportLevel = 'mothers' | 'children' | 'grandchildren';
type ExportFormat = 'csv' | 'excel' | 'pdf';

const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length < 8) return '';
    try {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const date = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
        return '';
    }
};

export function ExportHierarchicalButton({
    data,
    childrenByMother,
    grandchildrenByChild,
    projectName,
    projectCode,
    type
}: ExportHierarchicalButtonProps) {
    const [open, setOpen] = useState(false);
    // Determinar nível padrão baseado se há netos disponíveis
    const hasGrandchildren = Object.values(grandchildrenByChild).some(children => children.length > 0);
    const [exportLevel, setExportLevel] = useState<ExportLevel>(hasGrandchildren ? 'grandchildren' : 'children');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
    const [isExporting, setIsExporting] = useState(false);

    // Filtrar dados baseado no nível escolhido
    const getFilteredData = (level: ExportLevel) => {
        const mothers = data.filter(item => item.isMother && item.level === 0);
        
        if (level === 'mothers') {
            return mothers.map(mother => ({
                level: 0,
                name: mother.name,
                value: mother.value,
                count: mother.count,
                category: mother.category || '',
                dates: mother.dates || [],
                emissao: '',
                baixa: ''
            }));
        }
        
        const result: Array<{
            level: number;
            name: string;
            value: number;
            count: number;
            category: string;
            dates: string[];
            emissao: string;
            baixa: string;
        }> = [];
        
        mothers.forEach(mother => {
            // Adicionar mãe
            result.push({
                level: 0,
                name: mother.name,
                value: mother.value,
                count: mother.count,
                category: mother.category || '',
                dates: mother.dates || [],
                emissao: '',
                baixa: ''
            });
            
            const children = childrenByMother[mother.id] || [];
            
            children.forEach(child => {
                // Adicionar filho
                result.push({
                    level: 1,
                    name: child.name,
                    value: child.value,
                    count: child.count,
                    category: child.category || '',
                    dates: child.dates || [],
                    emissao: '',
                    baixa: ''
                });
                
                // Se nível é grandchildren, adicionar netos
                if (level === 'grandchildren') {
                    const grandchildren = grandchildrenByChild[child.id] || [];
                    grandchildren.forEach(grandchild => {
                        result.push({
                            level: 2,
                            name: grandchild.name,
                            value: grandchild.value,
                            count: grandchild.count,
                            category: grandchild.category || '',
                            dates: grandchild.dates || [],
                            emissao: grandchild.emissao || '',
                            baixa: grandchild.baixa || ''
                        });
                    });
                }
            });
        });
        
        return result;
    };

    const handleExport = () => {
        setIsExporting(true);
        const filteredData = getFilteredData(exportLevel);
        
        try {
            if (exportFormat === 'csv') {
                exportToCSV(filteredData);
            } else if (exportFormat === 'excel') {
                exportToExcel(filteredData);
            } else {
                exportToPDF(filteredData);
            }
            setOpen(false);
        } catch (error) {
            console.error('Erro ao exportar:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const exportToCSV = (data: any[]) => {
        const headers = ['Nível', 'Item', 'Valor', 'Quantidade', 'Categoria', 'Emissão', 'Baixa'];
        const rows = data.map(item => [
            item.level === 0 ? 'Mãe' : item.level === 1 ? 'Filho' : 'Neto',
            item.name,
            formatCurrency(item.value),
            item.count,
            item.category,
            item.emissao ? formatDate(item.emissao) : '',
            item.baixa ? formatDate(item.baixa) : ''
        ]);

        const csv = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => String(cell).replace(/;/g, ',')).join(';'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_${projectCode}_${exportLevel}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToExcel = (data: any[]) => {
        const exportData = data.map(item => ({
            'Nível': item.level === 0 ? 'Mãe' : item.level === 1 ? 'Filho' : 'Neto',
            'Item': item.name,
            'Valor': item.value,
            'Quantidade': item.count,
            'Categoria': item.category,
            'Emissão': item.emissao ? formatDate(item.emissao) : '',
            'Baixa': item.baixa ? formatDate(item.baixa) : ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type === 'gastos' ? 'Gastos por Item' : 'Movimentações');
        XLSX.writeFile(wb, `${type}_${projectCode}_${exportLevel}.xlsx`);
    };

    const exportToPDF = (data: any[]) => {
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(type === 'gastos' ? `Gastos por Item - ${projectName}` : `Movimentações - ${projectName}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Código: ${projectCode}`, 14, 27);
        doc.text(`Nível: ${exportLevel === 'mothers' ? 'Mães' : exportLevel === 'children' ? 'Mães e Filhos' : 'Mães, Filhos e Netos'}`, 14, 32);
        doc.text(`Total de registros: ${data.length}`, 14, 37);

        const tableData = data.map(item => [
            item.level === 0 ? 'Mãe' : item.level === 1 ? 'Filho' : 'Neto',
            item.name.substring(0, 40),
            formatCurrency(item.value),
            item.count.toString(),
            item.category,
            item.emissao ? formatDate(item.emissao) : '',
            item.baixa ? formatDate(item.baixa) : ''
        ]);

        autoTable(doc, {
            head: [['Nível', 'Item', 'Valor', 'Qtd', 'Categoria', 'Emissão', 'Baixa']],
            body: tableData,
            startY: 45,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 66, 66] },
        });

        doc.save(`${type}_${projectCode}_${exportLevel}.pdf`);
    };

    return (
        <>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setOpen(true)}
                disabled={data.length === 0}
            >
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
            </Button>
            
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Exportar Relatório</DialogTitle>
                        <DialogDescription>
                            Escolha o nível de detalhamento e o formato do arquivo
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Nível de Detalhamento</Label>
                            <RadioGroup value={exportLevel} onValueChange={(value) => setExportLevel(value as ExportLevel)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mothers" id="mothers" />
                                    <Label htmlFor="mothers" className="font-normal cursor-pointer">
                                        Apenas Mães
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="children" id="children" />
                                    <Label htmlFor="children" className="font-normal cursor-pointer">
                                        Mães e Filhos
                                    </Label>
                                </div>
                                {hasGrandchildren && (
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="grandchildren" id="grandchildren" />
                                        <Label htmlFor="grandchildren" className="font-normal cursor-pointer">
                                            Mães, Filhos e Netos
                                        </Label>
                                    </div>
                                )}
                            </RadioGroup>
                        </div>
                        
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Formato do Arquivo</Label>
                            <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="csv" id="csv" />
                                    <Label htmlFor="csv" className="font-normal cursor-pointer flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        CSV (.csv)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="excel" id="excel" />
                                    <Label htmlFor="excel" className="font-normal cursor-pointer flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4" />
                                        Excel (.xlsx)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="pdf" id="pdf" />
                                    <Label htmlFor="pdf" className="font-normal cursor-pointer flex items-center gap-2">
                                        <File className="h-4 w-4" />
                                        PDF (.pdf)
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
                            Cancelar
                        </Button>
                        <Button onClick={handleExport} disabled={isExporting}>
                            {isExporting ? 'Exportando...' : 'Exportar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

