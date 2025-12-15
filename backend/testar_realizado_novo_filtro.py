import logging
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.protheus import PAD010

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def testar_realizado_novo_filtro():
    """Testa o novo filtro de realizado (PAD_NATURE > 4 dígitos)"""
    
    db = SessionLocal()
    try:
        custo = '001010170'
        
        print(f"\n{'='*100}")
        print(f"TESTE DO NOVO FILTRO DE REALIZADO - PAD_CUSTO: {custo}")
        print(f"Filtro: PAD_NATURE > 4 dígitos")
        print(f"{'='*100}\n")
        
        # Calcular realizado com o novo filtro (PAD_NATURE > 4)
        realized = db.query(func.sum(func.coalesce(PAD010.PAD_APAGAR, 0) + func.coalesce(PAD010.PAD_REALIZ, 0)))\
            .filter(
                PAD010.PAD_CUSTO == custo,
                func.length(PAD010.PAD_NATURE) > 4
            )\
            .scalar() or 0.0
        
        print(f"✅ Realizado calculado com novo filtro: R$ {realized:,.2f}")
        print(f"   (Esperado: R$ 2.726.777,57)\n")
        
        # Comparar com o valor esperado
        esperado = 2726777.57
        diferenca = abs(realized - esperado)
        
        if diferenca < 0.01:
            print(f"✅ SUCESSO! O valor calculado corresponde ao esperado.")
        else:
            print(f"⚠️  ATENÇÃO: Diferença de R$ {diferenca:,.2f} entre calculado e esperado")
        
        # Mostrar detalhamento
        print(f"\n{'='*100}")
        print("DETALHAMENTO DOS REGISTROS INCLUÍDOS:")
        print(f"{'='*100}\n")
        
        registros = db.query(
            PAD010.R_E_C_N_O_,
            PAD010.PAD_NATURE,
            PAD010.PAD_APAGAR,
            PAD010.PAD_REALIZ,
            PAD010.PAD_DESCRI
        ).filter(
            PAD010.PAD_CUSTO == custo,
            func.length(PAD010.PAD_NATURE) > 4,
            PAD010.D_E_L_E_T_ != '*'
        ).all()
        
        print(f"{'R_E_C_N_O_':<12} {'PAD_NATURE':<12} {'PAD_APAGAR':<15} {'PAD_REALIZ':<15} {'SOMA':<15} {'PAD_DESCRI':<40}")
        print(f"{'-'*12} {'-'*12} {'-'*15} {'-'*15} {'-'*15} {'-'*40}")
        
        total_apagar = 0.0
        total_realiz = 0.0
        
        for reg in registros:
            apagar = reg.PAD_APAGAR if reg.PAD_APAGAR else 0.0
            realiz = reg.PAD_REALIZ if reg.PAD_REALIZ else 0.0
            soma = apagar + realiz
            total_apagar += apagar
            total_realiz += realiz
            
            descri = (reg.PAD_DESCRI or '')[:38] if reg.PAD_DESCRI else ''
            print(f"{reg.R_E_C_N_O_:<12} {reg.PAD_NATURE:<12} {apagar:<15.2f} {realiz:<15.2f} {soma:<15.2f} {descri:<40}")
        
        print(f"\n{'TOTAIS:':<39} {total_apagar:<15.2f} {total_realiz:<15.2f} {total_apagar + total_realiz:<15.2f}")
        print(f"{'='*100}\n")
        
    except Exception as e:
        logger.error(f"Erro ao testar novo filtro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    testar_realizado_novo_filtro()






