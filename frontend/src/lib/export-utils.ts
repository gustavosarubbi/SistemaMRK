import { Project, DashboardData, ProjectListItem } from '@/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Formatar moeda para exibição
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

// Formatar data de YYYYMMDD para DD/MM/YYYY
const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return '-';
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
};

// Preparar dados para exportação
const prepareExportData = (projects: Project[]) => {
    return projects.map((project) => ({
        'Centro de Custo': project.CTT_CUSTO,
        'Descrição': project.CTT_DESC01 || '-',
        'Cliente': project.CTT_UNIDES || '-',
        'Coordenador': project.CTT_NOMECO || '-',
        'Data Início': formatDate(project.CTT_DTINI),
        'Data Fim': formatDate(project.CTT_DTFIM),
        'Orçamento': formatCurrency(project.budget || 0),
        'Realizado': formatCurrency(project.realized || 0),
        'Saldo': formatCurrency((project.realized || 0) - (project.budget || 0)),
        '% Execução': `${(project.usage_percent || 0).toFixed(1)}%`,
        'Status': project.CTT_BLOQ === '1' ? 'Bloqueado' : 'Ativo',
    }));
};

// Exportar para CSV
export function exportToCSV(projects: Project[], filename: string = 'projetos'): void {
    const data = prepareExportData(projects);
    
    if (data.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
    }

    // Obter cabeçalhos
    const headers = Object.keys(data[0]);
    
    // Criar conteúdo CSV com BOM para compatibilidade Excel
    const BOM = '\uFEFF';
    const csvContent = [
        headers.join(';'),
        ...data.map((row) =>
            headers.map((header) => {
                const value = row[header as keyof typeof row];
                // Escapar aspas e envolver em aspas se contiver separador
                const stringValue = String(value).replace(/"/g, '""');
                return stringValue.includes(';') || stringValue.includes('"')
                    ? `"${stringValue}"`
                    : stringValue;
            }).join(';')
        ),
    ].join('\n');

    // Criar blob e download
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
}

// Exportar para Excel
export function exportToExcel(projects: Project[], filename: string = 'projetos'): void {
    const data = prepareExportData(projects);
    
    if (data.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
    }

    // Criar workbook e worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar largura das colunas
    const columnWidths = Object.keys(data[0]).map((key) => {
        const maxLength = Math.max(
            key.length,
            ...data.map((row) => String(row[key as keyof typeof row]).length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = columnWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projetos');

    // Gerar arquivo e download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Exportar para PDF
export function exportToPDF(projects: Project[], filename: string = 'projetos'): void {
    const data = prepareExportData(projects);
    
    if (data.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
    }

    // Criar documento PDF em landscape para mais espaço
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    // Adicionar título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Projetos', 14, 20);

    // Adicionar data de geração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);
    doc.text(`Total de projetos: ${projects.length}`, 14, 34);

    // Preparar dados para a tabela
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((header) => row[header as keyof typeof row]));

    // Calcular totais
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalRealized = projects.reduce((sum, p) => sum + (p.realized || 0), 0);
    const totalBalance = totalRealized - totalBudget;

    // Adicionar tabela
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 40,
        styles: {
            fontSize: 7,
            cellPadding: 2,
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            0: { cellWidth: 25 }, // Centro de Custo
            1: { cellWidth: 40 }, // Descrição
            2: { cellWidth: 30 }, // Cliente
            3: { cellWidth: 25 }, // Coordenador
            4: { cellWidth: 20 }, // Data Início
            5: { cellWidth: 20 }, // Data Fim
            6: { cellWidth: 25, halign: 'right' }, // Orçamento
            7: { cellWidth: 25, halign: 'right' }, // Realizado
            8: { cellWidth: 25, halign: 'right' }, // Saldo
            9: { cellWidth: 18, halign: 'center' }, // % Execução
            10: { cellWidth: 18, halign: 'center' }, // Status
        },
        didDrawPage: (data) => {
            // Rodapé com paginação
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(
                `Página ${data.pageNumber} de ${pageCount}`,
                doc.internal.pageSize.width - 30,
                doc.internal.pageSize.height - 10
            );
        },
    });

    // Adicionar resumo após a tabela
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 40;
    
    if (finalY + 30 < doc.internal.pageSize.height) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo Financeiro', 14, finalY + 15);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Orçamento Total: ${formatCurrency(totalBudget)}`, 14, finalY + 22);
        doc.text(`Realizado Total: ${formatCurrency(totalRealized)}`, 14, finalY + 28);
        doc.text(`Saldo Total: ${formatCurrency(totalBalance)}`, 14, finalY + 34);
    }

    // Salvar PDF
    doc.save(`${filename}.pdf`);
}

// Função auxiliar para download de blob
function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Exportar função genérica
export type ExportFormat = 'csv' | 'excel' | 'pdf';

export function exportProjects(
    projects: Project[],
    format: ExportFormat,
    filename: string = 'projetos'
): void {
    switch (format) {
        case 'csv':
            exportToCSV(projects, filename);
            break;
        case 'excel':
            exportToExcel(projects, filename);
            break;
        case 'pdf':
            exportToPDF(projects, filename);
            break;
        default:
            console.error('Formato de exportação não suportado:', format);
    }
}

// Exportar dados do dashboard
export async function exportDashboardData(
    data: DashboardData,
    format: 'pdf' | 'excel',
    type: 'kpis' | 'projects' | 'full'
): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (type === 'kpis') {
        // Export only KPIs
        if (format === 'pdf') {
            exportKPIsToPDF(data, `dashboard-kpis-${timestamp}`);
        } else {
            exportKPIsToExcel(data, `dashboard-kpis-${timestamp}`);
        }
    } else if (type === 'projects') {
        // Export projects in execution
        const projects = data.projects_in_execution || [];
        const projectsAsProject: Project[] = projects.map(p => ({
            CTT_CUSTO: p.id,
            CTT_DESC01: p.name,
            CTT_UNIDES: '',
            CTT_DTINI: '',
            CTT_DTFIM: '',
            CTT_SALINI: p.budget,
            budget: p.budget,
            realized: p.realized,
            usage_percent: p.usage_percent,
        }));
        
        if (format === 'pdf') {
            exportToPDF(projectsAsProject, `projetos-execucao-${timestamp}`);
        } else {
            exportToExcel(projectsAsProject, `projetos-execucao-${timestamp}`);
        }
    } else {
        // Export full report
        if (format === 'pdf') {
            exportFullDashboardToPDF(data, `dashboard-completo-${timestamp}`);
        } else {
            exportFullDashboardToExcel(data, `dashboard-completo-${timestamp}`);
        }
    }
}

// Export KPIs to PDF
function exportKPIsToPDF(data: DashboardData, filename: string): void {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Dashboard', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);
    
    let y = 40;
    
    // KPIs
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Principais (KPIs)', 14, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const kpis = [
        ['Total de Projetos', data.kpis.total_projects.toString()],
        ['Orçamento Total', formatCurrency(data.kpis.total_budget)],
        ['Realizado Total', formatCurrency(data.kpis.total_realized)],
        ['Saldo Orçamentário', formatCurrency(data.kpis.balance)],
        ['Em Execução', (data.kpis.in_execution || 0).toString()],
        ['Finalizando', (data.kpis.ending_soon || 0).toString()],
    ];
    
    autoTable(doc, {
        head: [['Indicador', 'Valor']],
        body: kpis,
        startY: y,
        styles: { fontSize: 10 },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
        },
    });
    
    doc.save(`${filename}.pdf`);
}

// Export KPIs to Excel
function exportKPIsToExcel(data: DashboardData, filename: string): void {
    const workbook = XLSX.utils.book_new();
    
    const kpisData = [
        ['Indicador', 'Valor'],
        ['Total de Projetos', data.kpis.total_projects],
        ['Orçamento Total', data.kpis.total_budget],
        ['Realizado Total', data.kpis.total_realized],
        ['Saldo Orçamentário', data.kpis.balance],
        ['Em Execução', data.kpis.in_execution || 0],
        ['Finalizando', data.kpis.ending_soon || 0],
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(kpisData);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KPIs');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export full dashboard to PDF
function exportFullDashboardToPDF(data: DashboardData, filename: string): void {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Completo do Dashboard', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);
    
    let y = 40;
    
    // KPIs
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Principais', 14, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const kpis = [
        ['Total de Projetos', data.kpis.total_projects.toString()],
        ['Orçamento Total', formatCurrency(data.kpis.total_budget)],
        ['Realizado Total', formatCurrency(data.kpis.total_realized)],
        ['Saldo Orçamentário', formatCurrency(data.kpis.balance)],
    ];
    
    autoTable(doc, {
        head: [['Indicador', 'Valor']],
        body: kpis,
        startY: y,
        styles: { fontSize: 10 },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
        },
    });
    
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    
    // Status Stats
    if (data.status_stats) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Estatísticas por Status', 14, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const stats = [
            ['Em Execução', data.status_stats.in_execution.toString()],
            ['Finalizando', data.status_stats.ending_soon.toString()],
            ['Prestar Contas', data.status_stats.rendering_accounts.toString()],
            ['Não Iniciados', data.status_stats.not_started.toString()],
        ];
        
        autoTable(doc, {
            head: [['Status', 'Quantidade']],
            body: stats,
            startY: y,
            styles: { fontSize: 10 },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
            },
        });
        
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }
    
    // Projects in execution
    if (data.projects_in_execution && data.projects_in_execution.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Projetos em Execução', 14, y);
        y += 10;
        
        const projectsData = data.projects_in_execution.map(p => [
            p.name,
            p.daysRemaining !== null ? `${p.daysRemaining} dias` : '-',
            formatCurrency(p.budget),
            formatCurrency(p.realized),
            `${p.usage_percent.toFixed(1)}%`,
        ]);
        
        autoTable(doc, {
            head: [['Projeto', 'Dias Restantes', 'Orçamento', 'Realizado', '% Execução']],
            body: projectsData,
            startY: y,
            styles: { fontSize: 8 },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
            },
        });
    }
    
    doc.save(`${filename}.pdf`);
}

// Export full dashboard to Excel
function exportFullDashboardToExcel(data: DashboardData, filename: string): void {
    const workbook = XLSX.utils.book_new();
    
    // KPIs Sheet
    const kpisData = [
        ['Indicador', 'Valor'],
        ['Total de Projetos', data.kpis.total_projects],
        ['Orçamento Total', data.kpis.total_budget],
        ['Realizado Total', data.kpis.total_realized],
        ['Saldo Orçamentário', data.kpis.balance],
        ['Em Execução', data.kpis.in_execution || 0],
        ['Finalizando', data.kpis.ending_soon || 0],
    ];
    const kpisSheet = XLSX.utils.aoa_to_sheet(kpisData);
    kpisSheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, kpisSheet, 'KPIs');
    
    // Status Stats Sheet
    if (data.status_stats) {
        const statsData = [
            ['Status', 'Quantidade'],
            ['Em Execução', data.status_stats.in_execution],
            ['Finalizando', data.status_stats.ending_soon],
            ['Prestar Contas', data.status_stats.rendering_accounts],
            ['Não Iniciados', data.status_stats.not_started],
        ];
        const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
        statsSheet['!cols'] = [{ wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Status');
    }
    
    // Projects Sheet
    if (data.projects_in_execution && data.projects_in_execution.length > 0) {
        const projectsData = [
            ['Projeto', 'Dias Restantes', 'Orçamento', 'Realizado', '% Execução'],
            ...data.projects_in_execution.map(p => [
                p.name,
                p.daysRemaining !== null ? p.daysRemaining : '-',
                p.budget,
                p.realized,
                p.usage_percent,
            ]),
        ];
        const projectsSheet = XLSX.utils.aoa_to_sheet(projectsData);
        projectsSheet['!cols'] = [
            { wch: 40 },
            { wch: 15 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 },
        ];
        XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projetos');
    }
    
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// ==================== BILLING EXPORT FUNCTIONS ====================

interface BillingRecord {
    R_E_C_N_O_?: number;
    C6_CUSTO?: string;
    C6_PRCVEN?: number;
    C6_ITEM?: string;
    C6_SERIE?: string;
    C6_NOTA?: string;
    C6_FILIAL?: string;
    C6_DATFAT?: string;
    C6_DESCRI?: string;
}

interface BillingData {
    project_code: string;
    project_name: string;
    billing_records: BillingRecord[];
    total_billing: number;
    count: number;
    total_provisions?: number;
    billed?: number;
    pending?: number;
}

// Formatar data de YYYYMMDD para DD/MM/YYYY
const formatBillingDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr.length !== 8) return '-';
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
};

// Preparar dados de faturamento para exportação
const prepareBillingExportData = (data: BillingData) => {
    return data.billing_records.map((record) => ({
        'Nº Parcela': record.C6_ITEM || '-',
        'Data Faturamento': formatBillingDate(record.C6_DATFAT),
        'Série': record.C6_SERIE || '-',
        'Nota': record.C6_NOTA || '-',
        'Descrição': record.C6_DESCRI || '-',
        'Valor da Parcela': record.C6_PRCVEN || 0,
        'Valor Formatado': formatCurrency(record.C6_PRCVEN || 0),
    }));
};

// Exportar faturamento para CSV
export function exportBillingToCSV(data: BillingData, filename: string = 'faturamento'): void {
    const exportData = prepareBillingExportData(data);
    
    if (exportData.length === 0) {
        console.warn('Nenhum dado de faturamento para exportar');
        return;
    }

    // Obter cabeçalhos
    const headers = Object.keys(exportData[0]);
    
    // Criar conteúdo CSV com BOM para compatibilidade Excel
    const BOM = '\uFEFF';
    const csvContent = [
        headers.join(';'),
        ...exportData.map((row) =>
            headers.map((header) => {
                const value = row[header as keyof typeof row];
                const stringValue = String(value).replace(/"/g, '""');
                return stringValue.includes(';') || stringValue.includes('"')
                    ? `"${stringValue}"`
                    : stringValue;
            }).join(';')
        ),
    ].join('\n');

    // Criar blob e download
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
}

// Exportar faturamento para Excel
export function exportBillingToExcel(data: BillingData, filename: string = 'faturamento'): void {
    const exportData = prepareBillingExportData(data);
    
    if (exportData.length === 0) {
        console.warn('Nenhum dado de faturamento para exportar');
        return;
    }

    // Criar workbook e worksheet
    const workbook = XLSX.utils.book_new();
    
    // Remover coluna "Valor Formatado" para Excel (manter apenas valor numérico)
    const excelData = exportData.map(({ 'Valor Formatado': _, ...rest }) => rest);
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar largura das colunas
    const columnWidths = Object.keys(excelData[0]).map((key) => {
        const maxLength = Math.max(
            key.length,
            ...excelData.map((row) => String(row[key as keyof typeof row]).length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = columnWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturamento');

    // Adicionar sheet de resumo
    const summaryData = [
        ['Informação', 'Valor'],
        ['Código do Projeto', data.project_code],
        ['Nome do Projeto', data.project_name],
        ['Total Faturado', data.total_billing],
        ['Número de Parcelas', data.count],
        ['Média por Parcela', data.count > 0 ? data.total_billing / data.count : 0],
        ['Total de Provisões', data.total_provisions || 0],
        ['Faturado', data.billed || data.total_billing],
        ['Pendente', data.pending || 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Gerar arquivo e download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Exportar faturamento para PDF
export function exportBillingToPDF(data: BillingData, filename: string = 'faturamento'): void {
    const exportData = prepareBillingExportData(data);
    
    if (exportData.length === 0) {
        console.warn('Nenhum dado de faturamento para exportar');
        return;
    }

    // Criar documento PDF em landscape para mais espaço
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    // Adicionar título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Faturamento', 14, 20);

    // Informações do projeto
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Projeto:', 14, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.project_code} - ${data.project_name}`, 40, 30);

    // Data de geração
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 36);

    // Resumo financeiro
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', 14, 44);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 50;
    doc.text(`Total Faturado: ${formatCurrency(data.total_billing)}`, 14, yPos);
    yPos += 6;
    doc.text(`Número de Parcelas: ${data.count}`, 14, yPos);
    yPos += 6;
    doc.text(`Média por Parcela: ${formatCurrency(data.count > 0 ? data.total_billing / data.count : 0)}`, 14, yPos);
    if (data.total_provisions !== undefined) {
        yPos += 6;
        doc.text(`Total de Provisões: ${formatCurrency(data.total_provisions)}`, 14, yPos);
        yPos += 6;
        doc.text(`Faturado: ${formatCurrency(data.billed || data.total_billing)}`, 14, yPos);
        yPos += 6;
        doc.text(`Pendente: ${formatCurrency(data.pending || 0)}`, 14, yPos);
    }

    // Preparar dados para a tabela
    const headers = ['Nº Parcela', 'Data Faturamento', 'Série', 'Nota', 'Descrição', 'Valor'];
    const rows = exportData.map((row) => [
        row['Nº Parcela'],
        row['Data Faturamento'],
        row['Série'],
        row['Nota'],
        row['Descrição'],
        row['Valor Formatado'],
    ]);

    // Adicionar tabela
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPos + 10,
        styles: {
            fontSize: 8,
            cellPadding: 2,
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            0: { cellWidth: 20 }, // Nº Parcela
            1: { cellWidth: 25 }, // Data Faturamento
            2: { cellWidth: 20 }, // Série
            3: { cellWidth: 25 }, // Nota
            4: { cellWidth: 60 }, // Descrição
            5: { cellWidth: 30, halign: 'right' }, // Valor
        },
        didDrawPage: (data) => {
            // Rodapé com paginação
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(
                `Página ${data.pageNumber} de ${pageCount}`,
                doc.internal.pageSize.width - 30,
                doc.internal.pageSize.height - 10
            );
        },
    });

    // Salvar PDF
    doc.save(`${filename}.pdf`);
}

// Exportar função genérica para faturamento
export function exportBilling(
    data: BillingData,
    format: ExportFormat,
    filename: string = 'faturamento'
): void {
    switch (format) {
        case 'csv':
            exportBillingToCSV(data, filename);
            break;
        case 'excel':
            exportBillingToExcel(data, filename);
            break;
        case 'pdf':
            exportBillingToPDF(data, filename);
            break;
        default:
            console.error('Formato de exportação não suportado:', format);
    }
}

