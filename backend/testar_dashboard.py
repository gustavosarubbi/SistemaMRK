"""
Script para testar o endpoint do dashboard e verificar por que está retornando zeros
"""
import sys
import os
from sqlalchemy import text, func

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.protheus import CTT010, PAC010, PAD010

def testar_dashboard():
    print("=" * 70)
    print("🧪 TESTANDO ENDPOINT DO DASHBOARD")
    print("=" * 70)
    
    db = SessionLocal()
    
    try:
        # 1. Verificar total de projetos sem filtro
        print("\n1️⃣ Verificando total de projetos (sem filtro)...")
        total_projects = db.query(func.count(CTT010.CTT_CUSTO)).scalar()
        print(f"   ✅ Total de projetos: {total_projects}")
        
        # 2. Verificar datas dos projetos
        print("\n2️⃣ Verificando datas dos projetos...")
        min_date = db.query(func.min(CTT010.CTT_DTINI)).scalar()
        max_date = db.query(func.max(CTT010.CTT_DTINI)).scalar()
        
        print(f"   📅 Data mínima: {min_date}")
        print(f"   📅 Data máxima: {max_date}")
        
        # 3. Testar filtro com data 2023-01-01
        print("\n3️⃣ Testando filtro com data 2023-01-01...")
        start_date = "2023-01-01"
        d_start = start_date.replace("-", "")
        print(f"   🔍 Buscando projetos com CTT_DTINI >= {d_start}")
        
        projects_with_filter = db.query(func.count(CTT010.CTT_CUSTO))\
            .filter(CTT010.CTT_DTINI >= d_start)\
            .scalar()
        print(f"   ✅ Projetos encontrados: {projects_with_filter}")
        
        # 4. Verificar alguns projetos de exemplo
        print("\n4️⃣ Verificando alguns projetos de exemplo...")
        sample_projects = db.query(CTT010.CTT_CUSTO, CTT010.CTT_DTINI, CTT010.CTT_DESC01)\
            .limit(5).all()
        
        for proj in sample_projects:
            print(f"   📋 {proj.CTT_CUSTO}: {proj.CTT_DTINI} - {proj.CTT_DESC01}")
        
        # 5. Verificar orçamento total sem filtro
        print("\n5️⃣ Verificando orçamento total (sem filtro)...")
        total_budget = db.query(func.sum(PAD010.PAD_ORCADO)).scalar() or 0.0
        print(f"   💰 Orçamento total: R$ {total_budget:,.2f}")
        
        # 6. Verificar realizado total sem filtro
        print("\n6️⃣ Verificando realizado total (sem filtro)...")
        total_realized = db.query(func.sum(PAC010.PAC_VALOR)).scalar() or 0.0
        print(f"   💵 Realizado total: R$ {total_realized:,.2f}")
        
        # 7. Testar com filtro de data
        print("\n7️⃣ Testando com filtro de data (2023-01-01)...")
        d_start = "20230101"
        
        # Total de projetos
        total_projects_filtered = db.query(func.count(CTT010.CTT_CUSTO))\
            .filter(CTT010.CTT_DTINI >= d_start)\
            .scalar() or 0
        print(f"   📊 Total de projetos: {total_projects_filtered}")
        
        # Orçamento total
        total_budget_filtered = db.query(func.sum(PAD010.PAD_ORCADO))\
            .join(CTT010, CTT010.CTT_CUSTO == PAD010.PAD_CUSTO)\
            .filter(CTT010.CTT_DTINI >= d_start)\
            .scalar() or 0.0
        print(f"   💰 Orçamento total: R$ {total_budget_filtered:,.2f}")
        
        # Realizado total
        total_realized_filtered = db.query(func.sum(PAC010.PAC_VALOR))\
            .join(CTT010, CTT010.CTT_CUSTO == PAC010.PAC_CUSTO)\
            .filter(CTT010.CTT_DTINI >= d_start)\
            .scalar() or 0.0
        print(f"   💵 Realizado total: R$ {total_realized_filtered:,.2f}")
        
        # 8. Verificar se há projetos sem data
        print("\n8️⃣ Verificando projetos sem data ou com data inválida...")
        projects_no_date = db.query(func.count(CTT010.CTT_CUSTO))\
            .filter(
                (CTT010.CTT_DTINI == None) | 
                (CTT010.CTT_DTINI == '') | 
                (CTT010.CTT_DTINI < '20000101')
            )\
            .scalar() or 0
        print(f"   ⚠️ Projetos com data inválida: {projects_no_date}")
        
        # 9. Verificar se há dados em PAD010 e PAC010
        print("\n9️⃣ Verificando dados em PAD010 e PAC010...")
        pad_count = db.query(func.count(PAD010.PAD_CUSTO)).scalar()
        pac_count = db.query(func.count(PAC010.PAC_CUSTO)).scalar()
        print(f"   📊 Registros em PAD010: {pad_count}")
        print(f"   📊 Registros em PAC010: {pac_count}")
        
        # 10. Verificar se há relacionamento entre as tabelas
        print("\n🔟 Verificando relacionamento entre tabelas...")
        projects_with_budget = db.query(func.count(func.distinct(PAD010.PAD_CUSTO))).scalar()
        projects_with_movements = db.query(func.count(func.distinct(PAC010.PAC_CUSTO))).scalar()
        print(f"   📊 Projetos com orçamento (PAD010): {projects_with_budget}")
        print(f"   📊 Projetos com movimentações (PAC010): {projects_with_movements}")
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
    
    print("\n" + "=" * 70)
    print("✅ TESTE CONCLUÍDO")
    print("=" * 70)

if __name__ == "__main__":
    testar_dashboard()

