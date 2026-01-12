from app.db.session import SessionLocal
from app.models.protheus import CTT010
from datetime import datetime
from sqlalchemy import func
import csv

def generate_report():
    db = SessionLocal()
    today = datetime.now().strftime('%Y%m%d')
    
    # Projetos que têm data de encerramento no ERP mas ainda estão em vigência
    query = db.query(CTT010).filter(
        CTT010.CTT_DTENC.isnot(None), 
        CTT010.CTT_DTENC != '', 
        func.len(CTT010.CTT_DTENC) == 8, 
        CTT010.CTT_DTENC <= today
    )
    query = query.filter(
        CTT010.CTT_DTINI <= today, 
        CTT010.CTT_DTFIM >= today
    )
    
    projects = query.all()
    
    report_path = 'mismatched_projects_report.csv'
    with open(report_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Custo', 'Descricao', 'Inicio', 'Fim', 'Encerramento_ERP', 'Status_Calculado'])
        for p in projects:
            writer.writerow([
                p.CTT_CUSTO.strip(), 
                p.CTT_DESC01.strip() if p.CTT_DESC01 else '', 
                p.CTT_DTINI, 
                p.CTT_DTFIM, 
                p.CTT_DTENC, 
                'EM EXECUCAO (Prioridade Vigencia)'
            ])
            
    print(f'Report generated with {len(projects)} projects at {report_path}')
    db.close()

if __name__ == "__main__":
    generate_report()
