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
print(f"Total internally finalized status: {len(finalized_custos)}")

counts = {
    "total_valid": 0,
    "in_execution": 0,
    "not_started": 0,
    "ended": 0,
    "closed_erp": 0,
    "rendering_accounts": 0,
    "finalized_internal": 0,
    "overlap_closed_finalized": 0,
    "bug_candidates": 0
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
    is_closed = dt_enc != '' and len(dt_enc) == 8 and dt_enc <= today
    is_not_started = dt_ini > today
    is_in_execution = dt_ini <= today and dt_fim >= today
    is_ended = dt_fim < today
    
    if is_finalized:
        counts["finalized_internal"] += 1
        
    if is_closed:
        counts["closed_erp"] += 1
        if is_finalized:
            counts["overlap_closed_finalized"] += 1
    
    # Rendering accounts logic
    if is_ended and not is_closed and not is_finalized:
        counts["rendering_accounts"] += 1
    
    if is_in_execution:
        counts["in_execution"] += 1
    
    if is_not_started:
        counts["not_started"] += 1

print(f"Total Validated: {counts['total_valid']}")
print(f"In Execution (ERP dates): {counts['in_execution']}")
print(f"Not Started (ERP dates): {counts['not_started']}")
print(f"Closed (ERP CTT_DTENC): {counts['closed_erp']}")
print(f"Finalized (Internal is_finalized): {counts['finalized_internal']}")
print(f"Rendering Accounts (Ended & NOT Closed & NOT Finalized): {counts['rendering_accounts']}")
print(f"Overlap (Closed AND Finalized): {counts['overlap_closed_finalized']}")

db.close()
