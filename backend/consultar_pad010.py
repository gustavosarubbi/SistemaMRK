import logging
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.protheus import PAD010

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def consultar_pad010():
    """Consulta valores de PAD_APAGAR e PAD_REALIZ da tabela PAD010
    para PAD_CUSTO = '001010170' onde PAD_NATURE tem mais de 4 dígitos"""
    
    db = SessionLocal()
    try:
        custo = '001010170'
        
        # Consulta com filtros
        registros = db.query(
            PAD010.R_E_C_N_O_,
            PAD010.PAD_CUSTO,
            PAD010.PAD_NATURE,
            PAD010.PAD_APAGAR,
            PAD010.PAD_REALIZ,
            PAD010.PAD_DESCRI,
            PAD010.PAD_FILIAL
        ).filter(
            PAD010.PAD_CUSTO == custo,
            func.len(PAD010.PAD_NATURE) > 4,
            PAD010.D_E_L_E_T_ != '*'  # Excluir registros deletados
        ).all()
        
        print(f"\n{'='*100}")
        print(f"Consulta PAD010 - PAD_CUSTO: {custo} | PAD_NATURE > 4 dígitos")
        print(f"{'='*100}\n")
        
        if not registros:
            print("❌ Nenhum registro encontrado com os critérios especificados.")
            return
        
        print(f"✅ Total de registros encontrados: {len(registros)}\n")
        print(f"{'R_E_C_N_O_':<12} {'PAD_CUSTO':<15} {'PAD_NATURE':<12} {'PAD_APAGAR':<15} {'PAD_REALIZ':<15} {'PAD_DESCRI':<40}")
        print(f"{'-'*12} {'-'*15} {'-'*12} {'-'*15} {'-'*15} {'-'*40}")
        
        total_apagar = 0.0
        total_realiz = 0.0
        
        for reg in registros:
            apagar = reg.PAD_APAGAR if reg.PAD_APAGAR else 0.0
            realiz = reg.PAD_REALIZ if reg.PAD_REALIZ else 0.0
            total_apagar += apagar
            total_realiz += realiz
            
            descri = (reg.PAD_DESCRI or '')[:38] if reg.PAD_DESCRI else ''
            
            print(f"{reg.R_E_C_N_O_:<12} {reg.PAD_CUSTO:<15} {reg.PAD_NATURE:<12} {apagar:<15.2f} {realiz:<15.2f} {descri:<40}")
        
        print(f"\n{'-'*100}")
        print(f"{'TOTAIS:':<39} {total_apagar:<15.2f} {total_realiz:<15.2f}")
        print(f"{'='*100}\n")
        
        # Estatísticas adicionais
        print("📊 Estatísticas:")
        print(f"   - Total PAD_APAGAR: R$ {total_apagar:,.2f}")
        print(f"   - Total PAD_REALIZ: R$ {total_realiz:,.2f}")
        print(f"   - Diferença (APAGAR - REALIZ): R$ {total_apagar - total_realiz:,.2f}")
        
        # Valores únicos de PAD_NATURE
        naturezas = db.query(PAD010.PAD_NATURE).filter(
            PAD010.PAD_CUSTO == custo,
            func.len(PAD010.PAD_NATURE) > 4,
            PAD010.D_E_L_E_T_ != '*'
        ).distinct().all()
        
        print(f"\n📋 Naturezas encontradas ({len(naturezas)}):")
        for nat in sorted([n[0] for n in naturezas if n[0]]):
            print(f"   - {nat}")
        
    except Exception as e:
        logger.error(f"Erro ao consultar PAD010: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    consultar_pad010()

