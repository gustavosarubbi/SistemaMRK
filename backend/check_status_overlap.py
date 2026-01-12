from app.db.session import SessionLocal
from app.models.protheus import CTT010
from app.models.project_status import ProjectStatus
from datetime import datetime
from sqlalchemy import func, or_

db = SessionLocal()
today = datetime.now().strftime("%Y%m%d")

all_projects = db.query(CTT010).all()
finalized_projects = db.query(ProjectStatus).filter(ProjectStatus.is_finalized == True).all()
finalized_custos = {str(p.CTT_CUSTO).strip() for p in finalized_projects}

print(f"Total projects in CTT010: {len(all_projects)}")
print(f"Total internally finalized: {len(finalized_custos)}")

# Stats logic from endpoint
rendering = []
closed = []
finalized_but_not_closed = []
closed_and_finalized = []

for p in all_projects:
    custo = str(p.CTT_CUSTO).strip()
    dt_ini = str(p.CTT_DTINI).strip()
    dt_fim = str(p.CTT_DTFIM).strip()
    dt_enc = str(p.CTT_DTENC).strip()
    
    if len(dt_ini) != 8 or len(dt_fim) != 8:
        continue
        
    is_finalized = custo in finalized_custos
    is_closed = dt_enc != '' and len(dt_enc) == 8 and dt_enc <= today
    is_ended = dt_fim < today
    
    if is_closed:
        closed.append(custo)
        if is_finalized:
            closed_and_finalized.append(custo)
    elif is_ended:
        if is_finalized:
             finalized_but_not_closed.append(custo)
        else:
             rendering.append(custo)

print(f"Closed (CTT_DTENC <= {today}): {len(closed)}")
print(f"Rendering Accounts (Ended but not Closed/Finalized): {len(rendering)}")
print(f"Finalized but NOT Closed (ERP): {len(finalized_but_not_closed)}")
print(f"Closed AND Finalized: {len(closed_and_finalized)}")

# Check if there are projects that transitioned to 'closed' recently
# Maybe CTT_DTENC IS being used for 'finalizado'?
db.close()
