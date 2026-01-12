from app.db.session import SessionLocal
from app.models.protheus import CTT010
from app.models.project_status import ProjectStatus
from datetime import datetime
from sqlalchemy import func

db = SessionLocal()
today = datetime.now().strftime("%Y%m%d")

all_projects = db.query(CTT010).all()
finalized_projects = db.query(ProjectStatus).filter(ProjectStatus.is_finalized == True).all()
finalized_custos = {str(p.CTT_CUSTO).strip() for p in finalized_projects}

print(f"Total projects in CTT010: {len(all_projects)}")

counts = {
    "total_valid": 0,
    "in_execution": 0,
    "not_started": 0,
    "closed_erp": 0,
    "rendering_accounts": 0,
    "finalized_internal": 0,
}

for p in all_projects:
    custo = str(p.CTT_CUSTO or "").strip()
    dt_ini = str(p.CTT_DTINI or "").strip()
    dt_fim = str(p.CTT_DTFIM or "").strip()
    dt_enc = str(p.CTT_DTENC or "").strip()
    
    if len(dt_ini) != 8 or len(dt_fim) != 8:
        continue
    
    counts["total_valid"] += 1
    
    is_finalized = custo in finalized_custos
    is_in_execution = dt_ini <= today and dt_fim >= today
    is_not_started = dt_ini > today
    is_closed = dt_enc != '' and len(dt_enc) == 8 and dt_enc <= today
    is_ended = dt_fim < today
    
    # Priority Logic:
    # 1. Finalizado
    # 2. Em Execução (Vigência)
    # 3. Encerrado (ERP)
    # 4. Prestar Contas
    
    if is_finalized:
        counts["finalized_internal"] += 1
    elif is_in_execution:
        counts["in_execution"] += 1
    elif is_closed:
        counts["closed_erp"] += 1
    elif is_ended:
        counts["rendering_accounts"] += 1
    elif is_not_started:
        counts["not_started"] += 1

print(f"Final Count with Priority (Finalized > Execution > Closed > Rendering):")
print(f"Finalized: {counts['finalized_internal']}")
print(f"In Execution: {counts['in_execution']}")
print(f"Closed (ERP): {counts['closed_erp']}")
print(f"Rendering Accounts: {counts['rendering_accounts']}")
print(f"Not Started: {counts['not_started']}")

db.close()
