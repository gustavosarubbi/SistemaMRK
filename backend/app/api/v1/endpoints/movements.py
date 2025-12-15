from typing import Any, List, Optional
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from sqlalchemy.inspection import inspect
from app.api import deps
from app.models.protheus import PAD010, SE2010

logger = logging.getLogger(__name__)

router = APIRouter()

def object_as_dict(obj):
    """
    Converts an SQLAlchemy model instance into a dictionary.
    Handles potential serialization issues by ensuring values are JSON compatible if needed.
    """
    if not obj:
        return {}
    
    result = {}
    for c in inspect(obj).mapper.column_attrs:
        val = getattr(obj, c.key)
        # Handle potential bytes/binary data from legacy DBs that might break JSON
        if isinstance(val, bytes):
            try:
                val = val.decode('utf-8', errors='ignore')
            except:
                val = str(val)
        
        # Clean strings (Protheus often has trailing spaces)
        if isinstance(val, str):
            val = val.strip()
            
        result[c.key] = val
    return result

@router.get("/{custo}", response_model=List[dict])
def read_movements(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get movements for a specific project (CC) from PAD010.
    Filters:
    - Exclude records where PAD_REALIZ = 0 AND PAD_APAGAR = 0
    - Exclude records where PAD_NATURE = '0001'
    """
    try:
        # Filter by PAD_CUSTO and exclude deleted records
        # In Protheus, D_E_L_E_T_ = '*' means deleted
        # Exclude records where PAD_REALIZ = 0 AND PAD_APAGAR = 0
        # Exclude records where PAD_NATURE = '0001'
        movements = db.query(PAD010)\
            .filter(PAD010.PAD_CUSTO == custo)\
            .filter(or_(
                PAD010.D_E_L_E_T_.is_(None),
                PAD010.D_E_L_E_T_ == '',
                PAD010.D_E_L_E_T_ != '*'
            ))\
            .filter(
                # Exclude where both PAD_REALIZ and PAD_APAGAR are 0
                # Include records where at least one is not 0
                or_(
                    and_(PAD010.PAD_REALIZ.isnot(None), PAD010.PAD_REALIZ != 0),
                    and_(PAD010.PAD_APAGAR.isnot(None), PAD010.PAD_APAGAR != 0)
                )
            )\
            .filter(
                # Include PAD_NATURE with 4 digits (except '0001') OR with more than 4 digits
                or_(
                    and_(
                        func.length(PAD010.PAD_NATURE) == 4,
                        PAD010.PAD_NATURE != '0001'
                    ),
                    func.length(PAD010.PAD_NATURE) > 4
                )
            )\
            .order_by(PAD010.PAD_DESCRI)\
            .all()
        
        # Convert SQLAlchemy objects to dictionaries
        result = [object_as_dict(mov) for mov in movements]
        return result
    except Exception as e:
        # Log error and return empty list
        logger.error(f"Error reading movements for {custo}: {e}", exc_info=True)
        return []

@router.get("/{custo}/expenses", response_model=dict)
def get_expenses_by_period(
    custo: str,
    start_date: Optional[str] = Query(None, description="Start date in YYYYMMDD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYYMMDD format"),
    use_emissao: bool = Query(False, description="Use E2_EMISSAO for filtering instead of E2_BAIXA (default: False)"),
    db: Session = Depends(deps.get_db),  # Banco LOCAL (para PAD010 e SE2010)
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get expenses from SE2010 for a specific project filtered by date period.
    Uses E2_RUBRIC for matching with PAD_NATURE (4 dígitos).
    Groups by E2_RUBRIC and sums E2_VALOR.
    By default, filters by E2_BAIXA (date of payment). Set use_emissao=True to filter by E2_EMISSAO (date of issue).
    Returns a mapping of E2_RUBRIC -> total spent in the period.
    """
    try:
        custo_trimmed = custo.strip()
        
        # ============================================
        # LÓGICA FIXA ESTRUTURADA - TABELA DE MOVIMENTAÇÕES
        # ============================================
        # PASSO 1: Buscar PAD_NATURE de 4 dígitos (mães) - excluindo '0001'
        pad_records = db.query(PAD010.PAD_NATURE).filter(
            func.trim(PAD010.PAD_CUSTO) == custo_trimmed,
            or_(
                PAD010.D_E_L_E_T_.is_(None),
                PAD010.D_E_L_E_T_ == '',
                PAD010.D_E_L_E_T_ != '*'
            ),
            PAD010.PAD_NATURE.isnot(None),
            func.length(func.trim(PAD010.PAD_NATURE)) == 4,
            func.trim(PAD010.PAD_NATURE) != '0001'
        ).distinct().all()
        
        # Criar lista de PAD_NATURE de 4 dígitos (mães)
        mother_natures = []
        for pad in pad_records:
            pad_nature = str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else ''
            if pad_nature and len(pad_nature) == 4 and pad_nature != '0001':
                mother_natures.append(pad_nature)
        
        if not mother_natures:
            return {
                "expenses_by_subrub": {},
                "total": 0.0
            }
        
        # PASSO 2: Buscar SE2010 do banco LOCAL usando E2_RUBRIC
        # Incluir E2_EMISSAO e E2_BAIXA para retornar ambas as datas
        base_query = db.query(
            SE2010.E2_RUBRIC,
            SE2010.E2_VALOR,
            SE2010.E2_EMISSAO,
            SE2010.E2_BAIXA
        ).filter(
            func.trim(SE2010.E2_CUSTO) == custo_trimmed,
            or_(
                SE2010.D_E_L_E_T_.is_(None),
                SE2010.D_E_L_E_T_ == '',
                SE2010.D_E_L_E_T_ != '*'
            ),
            SE2010.E2_RUBRIC.isnot(None),
            SE2010.E2_VALOR.isnot(None)
        )
        
        # Apply date filters if provided
        # Por padrão usa E2_BAIXA, mas pode usar E2_EMISSAO se use_emissao=True
        if start_date:
            start_date_formatted = start_date.replace("-", "") if "-" in start_date else start_date
            if use_emissao:
                # Filtrar por E2_EMISSAO
                base_query = base_query.filter(SE2010.E2_EMISSAO >= start_date_formatted)
            else:
                # Filtrar por E2_BAIXA (padrão)
                base_query = base_query.filter(SE2010.E2_BAIXA >= start_date_formatted)
        
        if end_date:
            end_date_formatted = end_date.replace("-", "") if "-" in end_date else end_date
            if use_emissao:
                # Filtrar por E2_EMISSAO
                base_query = base_query.filter(SE2010.E2_EMISSAO <= end_date_formatted)
            else:
                # Filtrar por E2_BAIXA (padrão)
                base_query = base_query.filter(SE2010.E2_BAIXA <= end_date_formatted)
        
        all_se2010_records = base_query.all()
        
        # PASSO 3: Filtrar em memória - Comparar valor inteiro de PAD_NATURE (4 dígitos) com E2_RUBRIC
        expenses_map = {}
        for row in all_se2010_records:
            e2_rubric = str(row.E2_RUBRIC).strip() if row.E2_RUBRIC else ''
            valor = float(row.E2_VALOR) if row.E2_VALOR else 0.0
            
            if e2_rubric:
                # Comparar valor inteiro: PAD_NATURE (4 dígitos) como mãe com E2_RUBRIC como filho
                # Normalizar para comparação: remover zeros à esquerda e comparar como inteiros
                try:
                    e2_rubric_normalized = e2_rubric.lstrip('0') or '0'  # Manter '0' se tudo for zeros
                    e2_rubric_int = int(e2_rubric_normalized)
                except (ValueError, AttributeError):
                    continue
                
                # Buscar PAD_NATURE de 4 dígitos cujo valor inteiro corresponde ao E2_RUBRIC
                for mother_nature in mother_natures:
                    try:
                        mother_normalized = mother_nature.lstrip('0') or '0'
                        mother_int = int(mother_normalized)
                        
                        # Comparar valores inteiros (ignorando zeros à esquerda)
                        if mother_int == e2_rubric_int:
                            expenses_map[e2_rubric] = expenses_map.get(e2_rubric, 0.0) + abs(valor)
                            break
                    except (ValueError, AttributeError):
                        continue
        
        return {
            "expenses_by_subrub": expenses_map,
            "total": sum(expenses_map.values())
        }
    except Exception as e:
        logger.error(f"Error reading expenses for {custo}: {e}", exc_info=True)
        return {
            "expenses_by_subrub": {},
            "total": 0.0
        }

@router.get("/{custo}/expenses-by-month", response_model=dict)
def get_expenses_by_month(
    custo: str,
    use_emissao: bool = Query(False, description="Use E2_EMISSAO for grouping instead of E2_BAIXA (default: False)"),
    db: Session = Depends(deps.get_db),  # Banco LOCAL (para PAD010 e SE2010)
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get expenses from SE2010 for a specific project grouped by month.
    Uses E2_RUBRIC for matching with PAD_NATURE (4 dígitos).
    Associates SE2010 with PAD010 where:
    - Compara valor inteiro de PAD_NATURE (4 dígitos) com E2_RUBRIC
    - E2_CUSTO = PAD_CUSTO
    - Exclui PAD_NATURE = '0001'
    By default, groups by E2_BAIXA (date of payment). Set use_emissao=True to group by E2_EMISSAO (date of issue).
    Returns a mapping of month (YYYY-MM format) -> total spent in that month.
    """
    try:
        custo_trimmed = custo.strip()
        
        # ============================================
        # LÓGICA FIXA ESTRUTURADA - TABELA DE MOVIMENTAÇÕES
        # ============================================
        # PASSO 1: Buscar PAD_NATURE de 4 dígitos (mães) - excluindo '0001'
        pad_records = db.query(PAD010.PAD_NATURE).filter(
            func.trim(PAD010.PAD_CUSTO) == custo_trimmed,
            or_(
                PAD010.D_E_L_E_T_.is_(None),
                PAD010.D_E_L_E_T_ == '',
                PAD010.D_E_L_E_T_ != '*'
            ),
            PAD010.PAD_NATURE.isnot(None),
            func.length(func.trim(PAD010.PAD_NATURE)) == 4,
            func.trim(PAD010.PAD_NATURE) != '0001'
        ).distinct().all()
        
        # Criar lista de PAD_NATURE de 4 dígitos (mães)
        mother_natures = []
        for pad in pad_records:
            pad_nature = str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else ''
            if pad_nature and len(pad_nature) == 4 and pad_nature != '0001':
                mother_natures.append(pad_nature)
        
        if not mother_natures:
            return {"expenses_by_month": {}, "total": 0.0}
        
        # PASSO 2: Buscar SE2010 do banco LOCAL usando E2_RUBRIC
        # Incluir E2_EMISSAO e E2_BAIXA para agrupamento por mês
        se2010_results = db.query(
            SE2010.E2_EMISSAO,
            SE2010.E2_BAIXA,
            SE2010.E2_VALOR,
            SE2010.E2_RUBRIC
        ).filter(
            func.trim(SE2010.E2_CUSTO) == custo_trimmed,
            or_(
                SE2010.D_E_L_E_T_.is_(None),
                SE2010.D_E_L_E_T_ == '',
                SE2010.D_E_L_E_T_ != '*'
            ),
            SE2010.E2_RUBRIC.isnot(None),
            SE2010.E2_VALOR.isnot(None)
        ).all()
        
        # PASSO 3: Filtrar em memória - Comparar valor inteiro de PAD_NATURE (4 dígitos) com E2_RUBRIC
        filtered_se2010_results = []
        for se2010 in se2010_results:
            e2_rubric = str(se2010.E2_RUBRIC).strip() if se2010.E2_RUBRIC else ''
            if e2_rubric:
                # Comparar valor inteiro: PAD_NATURE (4 dígitos) como mãe com E2_RUBRIC como filho
                try:
                    e2_rubric_normalized = e2_rubric.lstrip('0') or '0'
                    e2_rubric_int = int(e2_rubric_normalized)
                except (ValueError, AttributeError):
                    continue
                
                # Buscar PAD_NATURE de 4 dígitos cujo valor inteiro corresponde ao E2_RUBRIC
                for mother_nature in mother_natures:
                    try:
                        mother_normalized = mother_nature.lstrip('0') or '0'
                        mother_int = int(mother_normalized)
                        
                        # Comparar valores inteiros (ignorando zeros à esquerda)
                        if mother_int == e2_rubric_int:
                            filtered_se2010_results.append(se2010)
                            break
                    except (ValueError, AttributeError):
                        continue
        
        # PASSO 4: Agrupar por mês (formato YYYYMMDD -> YYYY-MM)
        # Por padrão usa E2_BAIXA, mas pode usar E2_EMISSAO se use_emissao=True
        expenses_by_month = {}
        skipped_count = 0
        
        for row in filtered_se2010_results:
            # Por padrão usar E2_BAIXA, mas pode usar E2_EMISSAO se solicitado
            if use_emissao:
                date_str = str(row.E2_EMISSAO).strip() if row.E2_EMISSAO else ''
                # Se E2_EMISSAO não disponível, usar E2_BAIXA como fallback
                if not date_str or len(date_str) < 8:
                    date_str = str(row.E2_BAIXA).strip() if row.E2_BAIXA else ''
            else:
                # Por padrão usar E2_BAIXA
                date_str = str(row.E2_BAIXA).strip() if row.E2_BAIXA else ''
                # Se E2_BAIXA não disponível, usar E2_EMISSAO como fallback
                if not date_str or len(date_str) < 8:
                    date_str = str(row.E2_EMISSAO).strip() if row.E2_EMISSAO else ''
            
            # Try to convert valor, handle None and invalid values
            try:
                valor = float(row.E2_VALOR) if row.E2_VALOR is not None else 0.0
            except (ValueError, TypeError):
                logger.warning(f"Invalid E2_VALOR for record, value: {row.E2_VALOR}")
                skipped_count += 1
                continue
            
            # Validate date format (should be YYYYMMDD, at least 8 characters)
            if not date_str or len(date_str) < 8:
                skipped_count += 1
                continue
            
            # Extract year and month (first 6 characters: YYYYMM)
            try:
                year = date_str[:4]
                month = date_str[4:6]
                
                # Validate year and month are numeric
                if not year.isdigit() or not month.isdigit():
                    logger.warning(f"Invalid date format in E2_EMISSAO/E2_BAIXA: {date_str}")
                    skipped_count += 1
                    continue
                
                # Validate month is between 01 and 12
                month_int = int(month)
                if month_int < 1 or month_int > 12:
                    logger.warning(f"Invalid month in E2_EMISSAO/E2_BAIXA: {date_str} (month: {month})")
                    skipped_count += 1
                    continue
                
                month_key = f"{year}-{month}"
                
                # Use absolute value to handle both debits and credits
                # Sum all values regardless of sign (expenses are typically positive)
                expenses_by_month[month_key] = expenses_by_month.get(month_key, 0.0) + abs(valor)
            except (ValueError, IndexError) as e:
                logger.warning(f"Error processing date {date_str}: {e}")
                skipped_count += 1
                continue
        
        if skipped_count > 0:
            logger.info(f"Skipped {skipped_count} records due to invalid data")
        
        logger.info(f"Expenses by month: {len(expenses_by_month)} months with data")
        total = sum(expenses_by_month.values())
        logger.info(f"Total expenses: {total}")
        
        return {
            "expenses_by_month": expenses_by_month,
            "total": total
        }
    except Exception as e:
        logger.error(f"Error reading expenses by month for {custo}: {e}", exc_info=True)
        return {
            "expenses_by_month": {},
            "total": 0.0
        }

@router.get("/{custo}/expenses-with-count", response_model=dict)
def get_expenses_with_count(
    custo: str,
    start_date: Optional[str] = Query(None, description="Start date in YYYYMMDD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYYMMDD format"),
    use_emissao: bool = Query(False, description="Use E2_EMISSAO for filtering instead of E2_BAIXA (default: False)"),
    db: Session = Depends(deps.get_db),  # Banco LOCAL (para PAD010 e SE2010)
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get expenses from SE2010 for a specific project filtered by date period.
    TABELA DE GASTOS DE ITENS:
    - Uses PAD_NATURE of 8 digits (except those starting with "0001") as mothers
    - Uses E2_SUBRUB as children (E2_SUBRUB must start with PAD_NATURE of 8 digits)
    - Uses E2_NOMEFOR for expense names (for children of children).
    - By default, filters by E2_BAIXA (date of payment). Set use_emissao=True to filter by E2_EMISSAO (date of issue).
    - Returns both E2_EMISSAO and E2_BAIXA in the records.
    Returns hierarchical structure where mothers are PAD_NATURE (8 digits) and children are E2_SUBRUB.
    """
    try:
        custo_trimmed = custo.strip()
        
        # ============================================
        # LÓGICA FIXA ESTRUTURADA - TABELA DE GASTOS DE ITENS
        # ============================================
        # PASSO 1: Buscar PAD_NATURE de 8 dígitos E 4 dígitos (mães) - excluindo iniciados com '0001'
        # Buscar tanto 8 dígitos quanto 4 dígitos para cobrir todos os casos
        pad_records_8digits = db.query(
            PAD010.PAD_NATURE,
            PAD010.PAD_DESCRI
        ).filter(
            func.trim(PAD010.PAD_CUSTO) == custo_trimmed,
            or_(
                PAD010.D_E_L_E_T_.is_(None),
                PAD010.D_E_L_E_T_ == '',
                PAD010.D_E_L_E_T_ != '*'
            ),
            PAD010.PAD_NATURE.isnot(None),
            func.length(func.trim(PAD010.PAD_NATURE)) == 8,
            ~func.trim(PAD010.PAD_NATURE).like('0001%')
        ).distinct().all()
        
        pad_records_4digits = db.query(
            PAD010.PAD_NATURE,
            PAD010.PAD_DESCRI
        ).filter(
            func.trim(PAD010.PAD_CUSTO) == custo_trimmed,
            or_(
                PAD010.D_E_L_E_T_.is_(None),
                PAD010.D_E_L_E_T_ == '',
                PAD010.D_E_L_E_T_ != '*'
            ),
            PAD010.PAD_NATURE.isnot(None),
            func.length(func.trim(PAD010.PAD_NATURE)) == 4,
            func.trim(PAD010.PAD_NATURE) != '0001'
        ).distinct().all()
        
        # Criar lista de PAD_NATURE de 8 dígitos e 4 dígitos (mães)
        mother_natures_8digits = []  # PAD_NATURE de 8 dígitos serão as mães
        mother_natures_4digits = []  # PAD_NATURE de 4 dígitos também podem ser mães
        mother_nature_to_descri = {}
        
        for pad in pad_records_8digits:
            pad_nature = str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else ''
            pad_descri = str(pad.PAD_DESCRI).strip() if pad.PAD_DESCRI else ''
            
            if pad_nature and len(pad_nature) == 8 and not pad_nature.startswith('0001'):
                mother_natures_8digits.append(pad_nature)
                mother_nature_to_descri[pad_nature] = pad_descri
        
        for pad in pad_records_4digits:
            pad_nature = str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else ''
            pad_descri = str(pad.PAD_DESCRI).strip() if pad.PAD_DESCRI else ''
            
            if pad_nature and len(pad_nature) == 4 and pad_nature != '0001':
                mother_natures_4digits.append(pad_nature)
                mother_nature_to_descri[pad_nature] = pad_descri
                # Log para debug - verificar se "0060" está sendo carregado
                if pad_nature == '0060':
                    logger.info(f"PAD_NATURE 0060 encontrado com descrição: '{pad_descri}'")
        
        # Combinar e ordenar por tamanho (maior primeiro) para matching mais específico
        all_mother_natures = mother_natures_8digits + mother_natures_4digits
        mother_natures_sorted = sorted(all_mother_natures, key=len, reverse=True)
        
        if not mother_natures_sorted:
            return {
                "expenses_by_child_nature": {},
                "child_nature_to_descri": {},
                "expenses_by_subrub": {},
                "count_by_subrub": {},
                "histor_by_subrub": {},
                "data_by_subrub": {},
                "category_by_subrub": {},
                "available_months": [],
                "total": 0.0,
                "total_transactions": 0
            }
        
        # PASSO 2: Buscar SE2010 do banco LOCAL usando E2_SUBRUB
        # Incluir E2_NOMEFOR para nomes, E2_EMISSAO e E2_BAIXA para datas
        base_query = db.query(
            SE2010.E2_SUBRUB,
            SE2010.E2_VALOR,
            SE2010.E2_NOMEFOR,
            SE2010.E2_EMISSAO,
            SE2010.E2_BAIXA
        ).filter(
            func.trim(SE2010.E2_CUSTO) == custo_trimmed,
            or_(
                SE2010.D_E_L_E_T_.is_(None),
                SE2010.D_E_L_E_T_ == '',
                SE2010.D_E_L_E_T_ != '*'
            ),
            SE2010.E2_SUBRUB.isnot(None),
            SE2010.E2_VALOR.isnot(None)
        )
        
        # Apply date filters if provided
        # Por padrão usa E2_BAIXA, mas pode usar E2_EMISSAO se use_emissao=True
        if start_date:
            start_date_formatted = start_date.replace("-", "") if "-" in start_date else start_date
            if use_emissao:
                # Filtrar por E2_EMISSAO
                base_query = base_query.filter(SE2010.E2_EMISSAO >= start_date_formatted)
            else:
                # Filtrar por E2_BAIXA (padrão)
                base_query = base_query.filter(SE2010.E2_BAIXA >= start_date_formatted)
        
        if end_date:
            end_date_formatted = end_date.replace("-", "") if "-" in end_date else end_date
            if use_emissao:
                # Filtrar por E2_EMISSAO
                base_query = base_query.filter(SE2010.E2_EMISSAO <= end_date_formatted)
            else:
                # Filtrar por E2_BAIXA (padrão)
                base_query = base_query.filter(SE2010.E2_BAIXA <= end_date_formatted)
        
        all_se2010_records = base_query.all()
        
        # PASSO 3: Agrupar por PAD_NATURE de 8 dígitos (mães) com E2_SUBRUB (filhos)
        # Estrutura: mother_nature_8digits -> lista de registros SE2010 (E2_SUBRUB)
        expenses_by_mother_nature: dict = {}
        available_months_set = set()
        
        # Função para determinar categoria baseada na descrição
        def get_category(descri: str, histor: str = '') -> str:
            # Garantir que são strings antes de usar operador 'in'
            histor_str = str(histor).upper() if histor else ''
            descri_str = str(descri).upper() if descri else ''
            
            if '/' in histor_str:
                parts = [p.strip() for p in histor_str.split('/')]
                if parts and ('BOLSA ENSINO' in parts[0] or 'BOLSA/ENSINO' in parts[0]):
                    return 'Bolsa Ensino'
                elif 'INTERPRETE' in histor_str or 'INTÉRPRETE' in histor_str:
                    return 'Bolsa Ensino'
                elif 'COORDENAÇÃO' in histor_str or 'COORDENACAO' in histor_str:
                    return 'Bolsa/Coordenação'
            
            if 'BOLSA ENSINO' in histor_str or 'BOLSA/ENSINO' in histor_str or 'BOLSA ENSINO' in descri_str:
                return 'Bolsa Ensino'
            elif 'INTERPRETE' in histor_str or 'INTÉRPRETE' in histor_str:
                return 'Bolsa Ensino'
            elif 'BOLSA/COORDENAÇÃO' in histor_str or 'BOLSA COORDENAÇÃO' in histor_str or 'BOLSA/COORDENACAO' in histor_str or 'BOLSA/COORDENAÇÃO' in descri_str:
                return 'Bolsa/Coordenação'
            elif 'BOLSA' in histor_str or 'BOLSA' in descri_str:
                return 'Bolsas'
            elif 'ATIVIDADE' in histor_str or 'ATIVIDADE' in descri_str:
                return 'Atividade'
            else:
                return 'Outros'
        
        for row in all_se2010_records:
            subrub = str(row.E2_SUBRUB).strip() if row.E2_SUBRUB else ''
            valor = float(row.E2_VALOR or 0.0)
            nomefor = str(row.E2_NOMEFOR or '').strip() if row.E2_NOMEFOR else ''
            emissao = str(row.E2_EMISSAO or '').strip() if row.E2_EMISSAO else ''
            baixa = str(row.E2_BAIXA or '').strip() if row.E2_BAIXA else ''
            
            if not subrub:
                continue
            
            # Encontrar o PAD_NATURE (8 ou 4 dígitos) correspondente
            # E2_SUBRUB pode começar com PAD_NATURE de 8 dígitos OU ser igual a PAD_NATURE de 4 dígitos
            matched_mother_nature = None
            for mother_nature in mother_natures_sorted:
                # Verificar se E2_SUBRUB começa com PAD_NATURE (para 8 dígitos)
                # OU se E2_SUBRUB é igual ao PAD_NATURE (para 4 dígitos)
                if subrub.startswith(mother_nature) or subrub == mother_nature:
                    matched_mother_nature = mother_nature
                    break
            
            # Se não encontrou match, tentar buscar por correspondência exata ou por últimos dígitos
            if not matched_mother_nature:
                # Tentar encontrar PAD_NATURE de 4 dígitos que corresponde aos primeiros 4 dígitos do subrub
                if len(subrub) >= 4:
                    first_4 = subrub[:4]
                    if first_4 in mother_nature_to_descri:
                        matched_mother_nature = first_4
                    else:
                        # Tentar encontrar por últimos dígitos (para casos como subrub "060" e nature "0060")
                        for mother_nature in mother_natures_4digits:
                            if mother_nature.endswith(subrub) or subrub.endswith(mother_nature):
                                matched_mother_nature = mother_nature
                                break
            
            # Se ainda não encontrou match, pular este registro
            if not matched_mother_nature:
                logger.warning(f"Nenhum PAD_NATURE encontrado para E2_SUBRUB '{subrub}'")
                continue
            
            # Log para debug - verificar se "0060" está sendo encontrado
            if subrub == '0060' or matched_mother_nature == '0060':
                descri = mother_nature_to_descri.get(matched_mother_nature, '')
                logger.info(f"E2_SUBRUB '{subrub}' -> PAD_NATURE '{matched_mother_nature}' -> Descrição: '{descri}'")
            
            # Inicializar estrutura para este mother_nature se não existir
            if matched_mother_nature not in expenses_by_mother_nature:
                expenses_by_mother_nature[matched_mother_nature] = {
                    'total': 0.0,
                    'count': 0,
                    'pac_records': [],  # Mantendo nome 'pac_records' para compatibilidade
                    'descri': str(mother_nature_to_descri.get(matched_mother_nature, '') or '')
                }
            
            # Adicionar registro SE2010 usando PAD_DESCRI (descrição da natureza) para o nome (histórico)
            # Incluir ambas as datas (E2_EMISSAO e E2_BAIXA) no registro
            # Usar a descrição do PAD_NATURE (mother_nature) ao invés de E2_NOMEFOR
            mother_descri = str(mother_nature_to_descri.get(matched_mother_nature, '') or '').strip()
            # Se não encontrou descrição, logar para debug
            if not mother_descri:
                logger.warning(f"Descrição não encontrada para PAD_NATURE '{matched_mother_nature}', subrub '{subrub}'")
            se2010_record = {
                'subrub': subrub,
                'valor': abs(valor),
                'histor': mother_descri if mother_descri else (str(nomefor or f'Item {subrub}')),  # Usar PAD_DESCRI como histor, fallback para E2_NOMEFOR
                'nomefor': str(nomefor or '').strip(),  # Incluir E2_NOMEFOR para uso nos netos
                'data': baixa if baixa and len(baixa) >= 8 else (emissao if emissao and len(emissao) >= 8 else ''),  # Usar E2_BAIXA como padrão para data
                'emissao': emissao,  # Incluir data de emissão
                'baixa': baixa,  # Incluir data de baixa
                'debcrd': '2'  # Assumir que todos são válidos
            }
            
            expenses_by_mother_nature[matched_mother_nature]['pac_records'].append(se2010_record)
            expenses_by_mother_nature[matched_mother_nature]['total'] += abs(valor)
            expenses_by_mother_nature[matched_mother_nature]['count'] += 1  # Contar todos como válidos
            
            # Extrair mês para available_months usando E2_BAIXA por padrão (ou E2_EMISSAO se E2_BAIXA não disponível)
            date_for_month = baixa if baixa and len(baixa) >= 8 else (emissao if emissao and len(emissao) >= 8 else '')
            if date_for_month and len(date_for_month) >= 8:
                try:
                    month_key = date_for_month[:6]  # YYYYMM
                    available_months_set.add(month_key)
                except:
                    pass
        
        # Criar mapeamentos legados para compatibilidade (agrupados por subrub)
        expenses_map = {}
        count_map = {}
        histor_map = {}
        data_map = {}
        category_map = {}
        total_value = 0.0
        total_transactions = 0
        
        for mother_nature, mother_data in expenses_by_mother_nature.items():
            # Filtrar apenas mother_nature com count > 0
            if mother_data['count'] == 0:
                continue
            
            # Agrupar registros SE2010 por subrub para mapeamentos legados
            subrub_groups: dict = {}
            
            for se2010_record in mother_data['pac_records']:
                subrub = se2010_record['subrub']
                
                if subrub not in subrub_groups:
                    subrub_groups[subrub] = {
                        'total': 0.0,
                        'count': 0,
                        'histors': {},
                        'dates': []
                    }
                
                subrub_groups[subrub]['total'] += se2010_record['valor']
                subrub_groups[subrub]['count'] += 1
                
                if se2010_record['histor']:
                    subrub_groups[subrub]['histors'][se2010_record['histor']] = \
                        subrub_groups[subrub]['histors'].get(se2010_record['histor'], 0) + 1
                
                if se2010_record['data']:
                    subrub_groups[subrub]['dates'].append(se2010_record['data'])
            
            # Adicionar ao mapeamento legado
            for subrub, subrub_data in subrub_groups.items():
                if subrub_data['count'] == 0:
                    continue
                
                expenses_map[subrub] = subrub_data['total']
                count_map[subrub] = subrub_data['count']
                
                # Get most common histor (que agora vem de PAD_DESCRI)
                # SEMPRE usar a descrição da mãe (mother_data['descri']) que vem do PAD_DESCRI
                # Isso garante que usamos a descrição correta do PAD_NATURE
                mother_descri = str(mother_data.get('descri', '') or '').strip()
                if mother_descri:
                    # Usar diretamente a descrição da mãe (PAD_DESCRI)
                    histor_map[subrub] = mother_descri
                else:
                    # Se não há descrição da mãe, tentar usar o histor mais comum (que já vem de PAD_DESCRI)
                    if subrub_data['histors']:
                        # Filtrar histors válidos (não vazios e não apenas números)
                        valid_histors = {k: v for k, v in subrub_data['histors'].items() 
                                       if k and k.strip() and not k.strip().isdigit()}
                        if valid_histors:
                            most_common_histor = max(valid_histors.items(), key=lambda x: x[1])[0]
                            histor_map[subrub] = most_common_histor
                        else:
                            histor_map[subrub] = f'Item {subrub}'
                    else:
                        histor_map[subrub] = f'Item {subrub}'
                
                # Datas únicas e ordenadas (vazio se SE2010 não tiver campo de data)
                unique_dates = sorted(list(set(subrub_data['dates']))) if subrub_data['dates'] else []
                data_map[subrub] = unique_dates
                
                # Categoria
                mother_descri = str(mother_data.get('descri', '') or '')
                histor_str = str(histor_map[subrub] or '')
                category_map[subrub] = get_category(mother_descri, histor_str)
                
                total_value += subrub_data['total']
                total_transactions += subrub_data['count']
        
        # Converter meses disponíveis para formato YYYY-MM
        available_months = sorted([f"{m[:4]}-{m[4:6]}" for m in available_months_set])
        
        return {
            "expenses_by_child_nature": {
                mother_nature: {
                    "total": data['total'],
                    "count": data['count'],
                    "descri": data['descri'],
                    "pac_records": data['pac_records']
                }
                for mother_nature, data in expenses_by_mother_nature.items()
                if data['count'] > 0  # Apenas com registros
            },
            "child_nature_to_descri": mother_nature_to_descri,
            "expenses_by_subrub": expenses_map,
            "count_by_subrub": count_map,
            "histor_by_subrub": histor_map,
            "data_by_subrub": data_map,
            "category_by_subrub": category_map,
            "available_months": available_months,
            "total": total_value,
            "total_transactions": total_transactions
        }
    except Exception as e:
        logger.error(f"Error reading expenses with count for {custo}: {e}", exc_info=True)
        return {
            "expenses_by_child_nature": {},
            "child_nature_to_descri": {},
            "expenses_by_subrub": {},
            "count_by_subrub": {},
            "histor_by_subrub": {},
            "data_by_subrub": {},
            "category_by_subrub": {},
            "available_months": [],
            "total": 0.0,
            "total_transactions": 0
        }

@router.get("/{custo}/debug", response_model=dict)
def debug_movements_data(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Debug endpoint to investigate PAD_NATURE to understand the data structure.
    Queries database directly to see real data.
    """
    try:
        custo_trimmed = custo.strip()
        logger.info(f"Debug endpoint called for custo: {custo_trimmed}")
        
        # First, check total counts
        total_pad = db.query(PAD010).filter(
            func.trim(PAD010.PAD_CUSTO) == custo_trimmed
        ).count()
        
        # Get PAD010 records - ALL records first to see what we have
        pad_all = db.query(
            PAD010.PAD_NATURE,
            PAD010.PAD_DESCRI,
            PAD010.PAD_CUSTO,
            PAD010.D_E_L_E_T_
        ).filter(
            func.trim(PAD010.PAD_CUSTO) == custo_trimmed
        ).limit(100).all()
        
        # Get PAD010 records with filters
        pad_records = db.query(
            PAD010.PAD_NATURE,
            PAD010.PAD_DESCRI,
            PAD010.PAD_CUSTO
        ).filter(
            func.trim(PAD010.PAD_CUSTO) == custo_trimmed,
            or_(
                PAD010.D_E_L_E_T_.is_(None),
                PAD010.D_E_L_E_T_ == '',
                PAD010.D_E_L_E_T_ != '*'
            ),
            PAD010.PAD_NATURE.isnot(None)
        ).distinct().limit(100).all()
        
        # Separate mothers (4 digits) and children (more than 4 digits)
        pad_mothers = []
        pad_children = []
        for pad in pad_records:
            pad_nature = str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else ''
            if pad_nature:
                if len(pad_nature) == 4 and pad_nature != '0001':
                    pad_mothers.append({
                        'nature': pad_nature,
                        'descri': pad.PAD_DESCRI or ''
                    })
                elif len(pad_nature) > 4:
                    pad_children.append({
                        'nature': pad_nature,
                        'descri': pad.PAD_DESCRI or ''
                    })
        
        # Analyze all PAD records (including deleted)
        pad_all_analysis = []
        for pad in pad_all[:20]:
            pad_all_analysis.append({
                'nature': str(pad.PAD_NATURE).strip() if pad.PAD_NATURE else '',
                'descri': pad.PAD_DESCRI or '',
                'deleted': pad.D_E_L_E_T_ or ''
            })
        
        return {
            "custo": custo_trimmed,
            "summary": {
                "total_pad_all": total_pad,
                "total_pad_filtered": len(pad_records)
            },
            "pad010_all_samples": pad_all_analysis,
            "pad010": {
                "total_records": len(pad_records),
                "mothers_count": len(pad_mothers),
                "children_count": len(pad_children),
                "mothers": pad_mothers[:20],
                "children": pad_children[:20]
            }
        }
    except Exception as e:
        logger.error(f"Error in debug endpoint for {custo}: {e}", exc_info=True)
        return {
            "error": str(e),
            "custo": custo.strip() if custo else ""
        }

