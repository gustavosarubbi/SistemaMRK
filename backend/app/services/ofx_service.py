import logging
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import OFXTransaction
from app.models.protheus import SE2010
from app.db.session import SessionAudit, SessionLocal, engine_local
from app.schemas.ofx import OFXTransactionCreate

logger = logging.getLogger(__name__)

class OFXService:
    def save_transactions(self, transactions: List[OFXTransactionCreate]) -> Dict[str, int]:
        new_count = 0
        exists_count = 0
        
        with SessionAudit() as db:
            for tx_data in transactions:
                # Check if FITID exists
                existing = db.query(OFXTransaction).filter(OFXTransaction.fitid == tx_data.fitid).first()
                if existing:
                    exists_count += 1
                    continue
                
                db_tx = OFXTransaction(**tx_data.model_dump())
                db.add(db_tx)
                new_count += 1
            
            db.commit()
            
        return {
            "total_processed": len(transactions),
            "new_records": new_count,
            "already_exists": exists_count
        }

    def get_transactions(
        self, 
        skip: int = 0, 
        limit: int = 100,
        start_date: datetime = None,
        end_date: datetime = None,
        min_amount: float = None,
        max_amount: float = None,
        project_id: str = None,
        search: str = None,
        trn_type: str = None,
        validation_status: str = None
    ) -> Dict[str, Any]:
        with SessionAudit() as db:
            query = db.query(OFXTransaction)
            
            if start_date:
                query = query.filter(OFXTransaction.dt_posted >= start_date)
            if end_date:
                query = query.filter(OFXTransaction.dt_posted <= end_date)
            if min_amount is not None:
                query = query.filter(OFXTransaction.amount >= min_amount)
            if max_amount is not None:
                query = query.filter(OFXTransaction.amount <= max_amount)
            if project_id:
                query = query.filter(OFXTransaction.project_id == project_id)
            if search:
                query = query.filter(OFXTransaction.memo.ilike(f"%{search}%"))
            # New Filters
            if trn_type == 'CREDIT':
                query = query.filter(OFXTransaction.amount > 0)
            elif trn_type == 'DEBIT':
                query = query.filter(OFXTransaction.amount < 0)
            
            if validation_status:
                query = query.filter(OFXTransaction.validation_status == validation_status)
            
            total = query.count()

            # Global stats for the current filter (before pagination)
            from sqlalchemy import func
            stats_query = db.query(
                func.sum(OFXTransaction.amount).label("total_sum"),
                func.count(OFXTransaction.id).filter(OFXTransaction.validation_status == 'VALIDATED').label("validated"),
                func.count(OFXTransaction.id).filter(OFXTransaction.validation_status == 'DISCREPANCY').label("discrepancies"),
                func.count(OFXTransaction.id).filter(OFXTransaction.project_id != None).label("associated")
            )
            
            # Apply same filters to stats
            if start_date: stats_query = stats_query.filter(OFXTransaction.dt_posted >= start_date)
            if end_date: stats_query = stats_query.filter(OFXTransaction.dt_posted <= end_date)
            if min_amount is not None: stats_query = stats_query.filter(OFXTransaction.amount >= min_amount)
            if max_amount is not None: stats_query = stats_query.filter(OFXTransaction.amount <= max_amount)
            if project_id: stats_query = stats_query.filter(OFXTransaction.project_id == project_id)
            if search: stats_query = stats_query.filter(OFXTransaction.memo.ilike(f"%{search}%"))
            if trn_type == 'CREDIT': stats_query = stats_query.filter(OFXTransaction.amount > 0)
            elif trn_type == 'DEBIT': stats_query = stats_query.filter(OFXTransaction.amount < 0)
            if validation_status: stats_query = stats_query.filter(OFXTransaction.validation_status == validation_status)
            
            stats_res = stats_query.one()
            
            stats = {
                "total_sum": float(stats_res.total_sum or 0),
                "validated": stats_res.validated,
                "discrepancies": stats_res.discrepancies,
                "associated": stats_res.associated,
                "total": total
            }

            data = query.order_by(OFXTransaction.dt_posted.desc()).offset(skip).limit(limit).all()
            
            return {
                "total": total,
                "data": data,
                "skip": skip,
                "limit": limit,
                "stats": stats
            }

    def associate_project(self, transaction_id: int, project_id: str) -> bool:
        with SessionAudit() as db:
            tx = db.query(OFXTransaction).filter(OFXTransaction.id == transaction_id).first()
            if not tx:
                return False
            tx.project_id = project_id
            db.commit()
            return True

    def auto_match_projects(self) -> int:
        """
        Attempts to auto-associate projects based on keywords in the memo.
        """
        count = 0
        with SessionAudit() as db_audit:
            # Only unassociated
            pending = db_audit.query(OFXTransaction).filter(OFXTransaction.project_id == None).all()
            
            with SessionLocal() as db_local:
                # Cache projects for performance (simplified)
                from app.models.protheus import CTT010
                projects = db_local.query(CTT010.CTT_CUSTO, CTT010.CTT_DESC01).all()
                
                for tx in pending:
                    for p_id, p_desc in projects:
                        # Match if Project ID or Name (partial) appears in memo
                        if p_id in tx.memo or (p_desc and p_desc.upper() in tx.memo.upper()):
                            tx.project_id = p_id
                            count += 1
                            break
            
            db_audit.commit()
        return count

    def validate_all_pending(self) -> Dict[str, int]:
        """
        Validate pending OFX transactions against SE2010 (Realized movements in Local DB).
        """
        results = {"validated": 0, "discrepancies": 0, "pending": 0}
        
        with SessionAudit() as db_audit:
            pending_txs = db_audit.query(OFXTransaction).filter(OFXTransaction.validation_status == "PENDING").all()
            
            if not pending_txs:
                return results

            with SessionLocal() as db_local:
                for tx in pending_txs:
                    # Search in SE2010
                    # Note: OFX amount is usually negative for debits. Protheus values are positive.
                    abs_amount = abs(tx.amount)
                    date_str = tx.dt_posted.strftime("%Y%m%d")
                    
                    # Search for matching amount and date in SE2010
                    match = db_local.query(SE2010).filter(
                        SE2010.E2_VALOR == abs_amount,
                        (SE2010.E2_BAIXA == date_str) | (SE2010.E2_EMISSAO == date_str)
                    ).first()
                    
                    if match:
                        tx.validation_status = "VALIDATED"
                        tx.validation_notes = f"Matched with SE2010 (RECN_O: {match.R_E_C_N_O_})"
                        results["validated"] += 1
                    else:
                        # If not found immediately, we don't mark as DISCREPANCY yet unless we are sure.
                        # For now, let's just mark as DISCREPANCY if not found to show the user.
                        tx.validation_status = "DISCREPANCY"
                        tx.validation_notes = "No matching record found in SE2010 with same amount and date."
                        results["discrepancies"] += 1
                    
                    tx.validated_at = datetime.now()
                
                db_audit.commit()
            
            # Recount statuses
            results["pending"] = db_audit.query(OFXTransaction).filter(OFXTransaction.validation_status == "PENDING").count()
            results["validated"] = db_audit.query(OFXTransaction).filter(OFXTransaction.validation_status == "VALIDATED").count()
            results["discrepancies"] = db_audit.query(OFXTransaction).filter(OFXTransaction.validation_status == "DISCREPANCY").count()
            
        return results

ofx_service = OFXService()
