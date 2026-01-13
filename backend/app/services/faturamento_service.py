import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.protheus import SC6010, SE1010, CTT010

logger = logging.getLogger(__name__)

class FaturamentoService:
    def get_faturamento_data(
        self, 
        db: Session, 
        custo: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch and categorize billing data from SC6010 and SE1010.
        
        Logic:
        - If C6_NOTA is empty -> "A FATURAR"
        - If C6_NOTA is filled:
            - Check SE1010 where E1_NUM == C6_NOTA
            - If E1_BAIXA is filled -> "RECEBIDO"
            - Else -> "FATURADO"
        """
        try:
            # Main query with Outer Join to SE1010
            # We join SC6010 and SE1010 to get everything in one go
            # SC6010 = Plan/Items, SE1010 = Receivables
            query = db.query(
                SC6010.C6_CUSTO,
                SC6010.C6_NOTA,
                SC6010.C6_VALOR,
                SC6010.C6_ITEM,
                SC6010.C6_DESCRI,
                SC6010.C6_DATFAT,
                CTT010.CTT_DESC01.label("projeto_nome"),
                SE1010.E1_BAIXA,
                SE1010.E1_VALOR.label("valor_recebido")
            ).outerjoin(
                CTT010, SC6010.C6_CUSTO == CTT010.CTT_CUSTO
            ).outerjoin(
                SE1010, (SC6010.C6_NOTA == SE1010.E1_NUM) & (SC6010.C6_CUSTO == SE1010.E1_CUSTO) & (SE1010.D_E_L_E_T_ != "*")
            ).filter(
                SC6010.D_E_L_E_T_ != "*"
            )
            
            if custo:
                query = query.filter(SC6010.C6_CUSTO == custo)
                
            if start_date:
                # Include items with empty date (To be Billed) OR date >= start_date
                query = query.filter(
                    (SC6010.C6_DATFAT >= start_date) | (SC6010.C6_DATFAT == "") | (SC6010.C6_DATFAT == None)
                )
            
            if end_date:
                query = query.filter(SC6010.C6_DATFAT <= end_date)
            
            rows = query.all()
            
            result = []
            for row in rows:
                status = "A FATURAR"
                c6_nota = (row.C6_NOTA or "").strip()
                
                if c6_nota:
                    # If we found a matching SE1010 record in the join
                    if row.E1_BAIXA and row.E1_BAIXA.strip():
                        status = "RECEBIDO"
                    else:
                        status = "FATURADO"
                
                result.append({
                    "custo": row.C6_CUSTO,
                    "projeto_nome": row.projeto_nome or "Projeto não identificado",
                    "item": row.C6_ITEM,
                    "descricao": row.C6_DESCRI,
                    "valor": row.C6_VALOR or 0.0,
                    "nota": c6_nota,
                    "data_faturamento": row.C6_DATFAT,
                    "data_baixa": row.E1_BAIXA,
                    "status": status
                })
                
            return result
                
            return result
        except Exception as e:
            logger.error(f"Error fetching faturamento data: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []

faturamento_service = FaturamentoService()
