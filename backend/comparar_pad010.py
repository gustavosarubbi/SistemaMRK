import logging
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.protheus import PAD010

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def comparar_pad010():
    """Compara os valores de PAD_APAGAR e PAD_REALIZ com diferentes filtros
    para identificar a discrepância entre o cálculo do sistema e o total real"""
    
    db = SessionLocal()
    try:
        custo = '001010170'
        
        print(f"\n{'='*100}")
        print(f"COMPARAÇÃO DE VALORES PAD010 - PAD_CUSTO: {custo}")
        print(f"{'='*100}\n")
        
        # 1. CONSULTA COM FILTRO DO SISTEMA (PAD_NATURE <= 4 e != '0001')
        print("1️⃣ FILTRO DO SISTEMA: PAD_NATURE <= 4 dígitos E PAD_NATURE != '0001'")
        print("-" * 100)
        
        registros_sistema = db.query(
            PAD010.R_E_C_N_O_,
            PAD010.PAD_CUSTO,
            PAD010.PAD_NATURE,
            PAD010.PAD_APAGAR,
            PAD010.PAD_REALIZ,
            PAD010.PAD_DESCRI
        ).filter(
            PAD010.PAD_CUSTO == custo,
            func.length(PAD010.PAD_NATURE) <= 4,
            PAD010.PAD_NATURE != '0001',
            PAD010.D_E_L_E_T_ != '*'
        ).all()
        
        total_apagar_sistema = 0.0
        total_realiz_sistema = 0.0
        
        print(f"{'R_E_C_N_O_':<12} {'PAD_NATURE':<12} {'PAD_APAGAR':<15} {'PAD_REALIZ':<15} {'SOMA':<15} {'PAD_DESCRI':<40}")
        print(f"{'-'*12} {'-'*12} {'-'*15} {'-'*15} {'-'*15} {'-'*40}")
        
        for reg in registros_sistema:
            apagar = reg.PAD_APAGAR if reg.PAD_APAGAR else 0.0
            realiz = reg.PAD_REALIZ if reg.PAD_REALIZ else 0.0
            soma = apagar + realiz
            total_apagar_sistema += apagar
            total_realiz_sistema += realiz
            
            descri = (reg.PAD_DESCRI or '')[:38] if reg.PAD_DESCRI else ''
            print(f"{reg.R_E_C_N_O_:<12} {reg.PAD_NATURE:<12} {apagar:<15.2f} {realiz:<15.2f} {soma:<15.2f} {descri:<40}")
        
        total_sistema = total_apagar_sistema + total_realiz_sistema
        print(f"\n{'TOTAIS (FILTRO SISTEMA):':<39} {total_apagar_sistema:<15.2f} {total_realiz_sistema:<15.2f} {total_sistema:<15.2f}")
        print(f"   Total (APAGAR + REALIZ) = R$ {total_sistema:,.2f}")
        print(f"   ✅ Este é o valor que o sistema mostra: R$ 2.680.547,84\n")
        
        # 2. CONSULTA SEM FILTRO DE PAD_NATURE (TODOS OS REGISTROS)
        print("\n2️⃣ SEM FILTRO DE PAD_NATURE (TODOS OS REGISTROS)")
        print("-" * 100)
        
        registros_todos = db.query(
            PAD010.R_E_C_N_O_,
            PAD010.PAD_CUSTO,
            PAD010.PAD_NATURE,
            PAD010.PAD_APAGAR,
            PAD010.PAD_REALIZ,
            PAD010.PAD_DESCRI
        ).filter(
            PAD010.PAD_CUSTO == custo,
            PAD010.D_E_L_E_T_ != '*'
        ).all()
        
        total_apagar_todos = 0.0
        total_realiz_todos = 0.0
        
        print(f"{'R_E_C_N_O_':<12} {'PAD_NATURE':<12} {'PAD_APAGAR':<15} {'PAD_REALIZ':<15} {'SOMA':<15} {'PAD_DESCRI':<40}")
        print(f"{'-'*12} {'-'*12} {'-'*15} {'-'*15} {'-'*15} {'-'*40}")
        
        for reg in registros_todos:
            apagar = reg.PAD_APAGAR if reg.PAD_APAGAR else 0.0
            realiz = reg.PAD_REALIZ if reg.PAD_REALIZ else 0.0
            soma = apagar + realiz
            total_apagar_todos += apagar
            total_realiz_todos += realiz
            
            descri = (reg.PAD_DESCRI or '')[:38] if reg.PAD_DESCRI else ''
            print(f"{reg.R_E_C_N_O_:<12} {reg.PAD_NATURE:<12} {apagar:<15.2f} {realiz:<15.2f} {soma:<15.2f} {descri:<40}")
        
        total_todos = total_apagar_todos + total_realiz_todos
        print(f"\n{'TOTAIS (TODOS):':<39} {total_apagar_todos:<15.2f} {total_realiz_todos:<15.2f} {total_todos:<15.2f}")
        print(f"   Total (APAGAR + REALIZ) = R$ {total_todos:,.2f}\n")
        
        # 3. CONSULTA APENAS PAD_NATURE > 4 DÍGITOS
        print("\n3️⃣ APENAS PAD_NATURE > 4 DÍGITOS (EXCLUÍDOS PELO SISTEMA)")
        print("-" * 100)
        
        registros_maior_4 = db.query(
            PAD010.R_E_C_N_O_,
            PAD010.PAD_CUSTO,
            PAD010.PAD_NATURE,
            PAD010.PAD_APAGAR,
            PAD010.PAD_REALIZ,
            PAD010.PAD_DESCRI
        ).filter(
            PAD010.PAD_CUSTO == custo,
            func.length(PAD010.PAD_NATURE) > 4,
            PAD010.D_E_L_E_T_ != '*'
        ).all()
        
        total_apagar_maior_4 = 0.0
        total_realiz_maior_4 = 0.0
        
        print(f"{'R_E_C_N_O_':<12} {'PAD_NATURE':<12} {'PAD_APAGAR':<15} {'PAD_REALIZ':<15} {'SOMA':<15} {'PAD_DESCRI':<40}")
        print(f"{'-'*12} {'-'*12} {'-'*15} {'-'*15} {'-'*15} {'-'*40}")
        
        for reg in registros_maior_4:
            apagar = reg.PAD_APAGAR if reg.PAD_APAGAR else 0.0
            realiz = reg.PAD_REALIZ if reg.PAD_REALIZ else 0.0
            soma = apagar + realiz
            total_apagar_maior_4 += apagar
            total_realiz_maior_4 += realiz
            
            descri = (reg.PAD_DESCRI or '')[:38] if reg.PAD_DESCRI else ''
            print(f"{reg.R_E_C_N_O_:<12} {reg.PAD_NATURE:<12} {apagar:<15.2f} {realiz:<15.2f} {soma:<15.2f} {descri:<40}")
        
        total_maior_4 = total_apagar_maior_4 + total_realiz_maior_4
        print(f"\n{'TOTAIS (PAD_NATURE > 4):':<39} {total_apagar_maior_4:<15.2f} {total_realiz_maior_4:<15.2f} {total_maior_4:<15.2f}")
        print(f"   Total (APAGAR + REALIZ) = R$ {total_maior_4:,.2f}\n")
        
        # 4. CONSULTA PAD_NATURE = '0001' (EXCLUÍDO PELO SISTEMA)
        print("\n4️⃣ PAD_NATURE = '0001' (EXCLUÍDO PELO SISTEMA)")
        print("-" * 100)
        
        registros_0001 = db.query(
            PAD010.R_E_C_N_O_,
            PAD010.PAD_CUSTO,
            PAD010.PAD_NATURE,
            PAD010.PAD_APAGAR,
            PAD010.PAD_REALIZ,
            PAD010.PAD_DESCRI
        ).filter(
            PAD010.PAD_CUSTO == custo,
            PAD010.PAD_NATURE == '0001',
            PAD010.D_E_L_E_T_ != '*'
        ).all()
        
        total_apagar_0001 = 0.0
        total_realiz_0001 = 0.0
        
        if registros_0001:
            print(f"{'R_E_C_N_O_':<12} {'PAD_NATURE':<12} {'PAD_APAGAR':<15} {'PAD_REALIZ':<15} {'SOMA':<15} {'PAD_DESCRI':<40}")
            print(f"{'-'*12} {'-'*12} {'-'*15} {'-'*15} {'-'*15} {'-'*40}")
            
            for reg in registros_0001:
                apagar = reg.PAD_APAGAR if reg.PAD_APAGAR else 0.0
                realiz = reg.PAD_REALIZ if reg.PAD_REALIZ else 0.0
                soma = apagar + realiz
                total_apagar_0001 += apagar
                total_realiz_0001 += realiz
                
                descri = (reg.PAD_DESCRI or '')[:38] if reg.PAD_DESCRI else ''
                print(f"{reg.R_E_C_N_O_:<12} {reg.PAD_NATURE:<12} {apagar:<15.2f} {realiz:<15.2f} {soma:<15.2f} {descri:<40}")
            
            total_0001 = total_apagar_0001 + total_realiz_0001
            print(f"\n{'TOTAIS (PAD_NATURE = 0001):':<39} {total_apagar_0001:<15.2f} {total_realiz_0001:<15.2f} {total_0001:<15.2f}")
            print(f"   Total (APAGAR + REALIZ) = R$ {total_0001:,.2f}\n")
        else:
            print("   ❌ Nenhum registro encontrado com PAD_NATURE = '0001'\n")
        
        # 5. RESUMO E COMPARAÇÃO
        print(f"\n{'='*100}")
        print("📊 RESUMO E COMPARAÇÃO")
        print(f"{'='*100}\n")
        
        print(f"✅ Total com filtro do sistema (PAD_NATURE <= 4 e != '0001'):")
        print(f"   R$ {total_sistema:,.2f}")
        print(f"   (Este é o valor que aparece no sistema: R$ 2.680.547,84)\n")
        
        print(f"📋 Total sem filtro de PAD_NATURE (todos os registros):")
        print(f"   R$ {total_todos:,.2f}\n")
        
        print(f"🔍 Valores excluídos pelo sistema:")
        print(f"   - PAD_NATURE > 4 dígitos: R$ {total_maior_4:,.2f}")
        print(f"   - PAD_NATURE = '0001': R$ {total_apagar_0001 + total_realiz_0001:,.2f}")
        print(f"   - Total excluído: R$ {total_maior_4 + total_apagar_0001 + total_realiz_0001:,.2f}\n")
        
        diferenca = total_todos - total_sistema
        print(f"⚠️  DIFERENÇA: R$ {diferenca:,.2f}")
        print(f"   (Total sem filtro - Total com filtro do sistema)\n")
        
        # Verificação matemática
        esperado_excluido = total_maior_4 + total_apagar_0001 + total_realiz_0001
        if abs(diferenca - esperado_excluido) < 0.01:
            print(f"✅ Verificação matemática OK: Diferença = Valores excluídos")
        else:
            print(f"⚠️  Atenção: Diferença não corresponde exatamente aos valores excluídos")
            print(f"   Diferença: R$ {diferenca:,.2f}")
            print(f"   Excluídos: R$ {esperado_excluido:,.2f}")
        
    except Exception as e:
        logger.error(f"Erro ao comparar PAD010: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    comparar_pad010()







