"""
Script para verificar se há erros sendo silenciados nos endpoints
"""
import sys
import os
import traceback
import logging

# Configurar logging para ver todos os erros
logging.basicConfig(level=logging.DEBUG)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def testar_endpoint_projetos_com_erros():
    print("=" * 70)
    print("🔍 TESTANDO ENDPOINT DE PROJETOS COM DETECÇÃO DE ERROS")
    print("=" * 70)
    
    try:
        from app.db.session import SessionLocal
        from app.models.protheus import CTT010, PAD010
        from sqlalchemy import func
        
        db = SessionLocal()
        
        # Simular a query do endpoint
        print("\n1️⃣ Testando query de projetos...")
        projects = db.query(CTT010).limit(5).all()
        print(f"   ✅ {len(projects)} projetos obtidos")
        
        # Testar query de budget
        print("\n3️⃣ Testando query de budget...")
        if custos_list:
            budget_results = db.query(
                PAD010.PAD_CUSTO,
                func.sum(PAD010.PAD_ORCADO).label('budget')
            ).filter(PAD010.PAD_CUSTO.in_(custos_list))\
             .group_by(PAD010.PAD_CUSTO).all()
            
            print(f"   ✅ {len(budget_results)} resultados obtidos")
            
            if budget_results:
                first_row = budget_results[0]
                print(f"   📋 Tipo do resultado: {type(first_row)}")
                print(f"   📋 Primeiro resultado: {first_row}")
                
                # Tentar acessar como atributo
                try:
                    custo = first_row.PAD_CUSTO
                    budget = first_row.budget
                    print(f"   ✅ Acesso como atributo OK: {custo} = {budget}")
                except AttributeError as e:
                    print(f"   ❌ Erro ao acessar como atributo: {e}")
                    # Tentar como tupla
                    try:
                        custo = first_row[0]
                        budget = first_row[1]
                        print(f"   ✅ Acesso como tupla OK: {custo} = {budget}")
                    except Exception as e2:
                        print(f"   ❌ Erro ao acessar como tupla: {e2}")
        
        db.close()
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 70)
    print("✅ TESTE CONCLUÍDO")
    print("=" * 70)
    return True

if __name__ == "__main__":
    testar_endpoint_projetos_com_erros()









