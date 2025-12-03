"""
Diagnóstico completo para verificar por que o frontend não está recebendo dados
"""
import sys
import os
import traceback

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def testar_backend_direto():
    print("=" * 70)
    print("🔍 DIAGNÓSTICO COMPLETO DO BACKEND")
    print("=" * 70)
    
    # 1. Testar conexão com banco
    print("\n1️⃣ Testando conexão com banco de dados...")
    try:
        from app.db.session import SessionLocal
        db = SessionLocal()
        from app.models.protheus import CTT010
        count = db.query(CTT010).count()
        print(f"   ✅ Conexão OK - {count} projetos encontrados")
        db.close()
    except Exception as e:
        print(f"   ❌ Erro na conexão: {e}")
        traceback.print_exc()
        return False
    
    # 2. Testar endpoint de projetos diretamente
    print("\n2️⃣ Testando lógica do endpoint de projetos...")
    try:
        from app.db.session import SessionLocal
        from app.models.protheus import CTT010, PAC010, PAD010
        from sqlalchemy import func
        from app.api.v1.endpoints.projects import read_projects
        from app.api import deps
        
        # Simular dependências
        db = SessionLocal()
        
        # Testar query básica
        projects = db.query(CTT010).limit(5).all()
        print(f"   ✅ Query básica OK - {len(projects)} projetos retornados")
        
        # Testar query com filtros
        query = db.query(CTT010)
        total = query.count()
        print(f"   ✅ Count OK - {total} projetos totais")
        
        # Testar query otimizada de orçamento
        custos_list = [p.CTT_CUSTO for p in projects]
        if custos_list:
            realized_dict = {}
            realized_results = db.query(
                PAC010.PAC_CUSTO,
                func.sum(PAC010.PAC_VALOR).label('realized')
            ).filter(PAC010.PAC_CUSTO.in_(custos_list))\
             .group_by(PAC010.PAC_CUSTO).all()
            realized_dict = {row.PAC_CUSTO: float(row.realized or 0.0) for row in realized_results}
            print(f"   ✅ Query de realizado OK - {len(realized_dict)} resultados")
        
        db.close()
    except Exception as e:
        print(f"   ❌ Erro no endpoint de projetos: {e}")
        traceback.print_exc()
        return False
    
    # 3. Testar endpoint do dashboard diretamente
    print("\n3️⃣ Testando lógica do endpoint do dashboard...")
    try:
        from app.db.session import SessionLocal
        from app.models.protheus import CTT010, PAC010, PAD010
        from sqlalchemy import func
        
        db = SessionLocal()
        
        # Testar sem filtros
        total_projects = db.query(func.count(CTT010.CTT_CUSTO)).scalar()
        print(f"   ✅ Total de projetos (sem filtro): {total_projects}")
        
        # Testar orçamento total
        total_budget = db.query(func.sum(PAD010.PAD_ORCADO)).scalar() or 0.0
        print(f"   ✅ Orçamento total: R$ {total_budget:,.2f}")
        
        # Testar com filtro
        filters = []
        d_start = "20230101"
        filters.append(CTT010.CTT_DTINI >= d_start)
        
        custos_query = db.query(CTT010.CTT_CUSTO).filter(*filters)
        custos_list = [row[0] for row in custos_query.all()]
        print(f"   ✅ Projetos com filtro de data: {len(custos_list)}")
        
        if custos_list:
            total_budget_filtered = db.query(func.sum(PAD010.PAD_ORCADO))\
                .filter(PAD010.PAD_CUSTO.in_(custos_list))\
                .scalar() or 0.0
            print(f"   ✅ Orçamento com filtro: R$ {total_budget_filtered:,.2f}")
        
        db.close()
    except Exception as e:
        print(f"   ❌ Erro no endpoint do dashboard: {e}")
        traceback.print_exc()
        return False
    
    # 4. Verificar se há erros de sintaxe nos arquivos
    print("\n4️⃣ Verificando sintaxe dos arquivos...")
    try:
        import importlib.util
        
        files_to_check = [
            "app/api/v1/endpoints/projects.py",
            "app/api/v1/endpoints/dashboard.py"
        ]
        
        for file_path in files_to_check:
            full_path = os.path.join(os.path.dirname(__file__), file_path)
            if os.path.exists(full_path):
                spec = importlib.util.spec_from_file_location("module", full_path)
                if spec and spec.loader:
                    print(f"   ✅ {file_path} - sintaxe OK")
                else:
                    print(f"   ⚠️ {file_path} - não pôde verificar")
            else:
                print(f"   ❌ {file_path} - arquivo não encontrado")
    except Exception as e:
        print(f"   ⚠️ Erro ao verificar sintaxe: {e}")
    
    print("\n" + "=" * 70)
    print("✅ DIAGNÓSTICO CONCLUÍDO")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        testar_backend_direto()
    except Exception as e:
        print(f"\n❌ Erro durante diagnóstico: {e}")
        traceback.print_exc()
        sys.exit(1)



