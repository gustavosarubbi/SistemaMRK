"""
Script para testar o endpoint do dashboard diretamente
"""
import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def testar_endpoint():
    base_url = "http://localhost:8000/api"
    
    print("=" * 70)
    print("🧪 TESTANDO ENDPOINT DO DASHBOARD")
    print("=" * 70)
    
    # 1. Fazer login
    print("\n1️⃣ Fazendo login...")
    try:
        login_data = {
            "username": "admin",
            "password": "admin"
        }
        response = requests.post(
            f"{base_url}/auth/login",
            data=login_data,
            timeout=5
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            print("   ✅ Login realizado com sucesso")
        else:
            print(f"   ❌ Login falhou: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Erro no login: {e}")
        return False
    
    # 2. Testar endpoint sem filtros
    print("\n2️⃣ Testando endpoint sem filtros...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{base_url}/dashboard/summary",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Endpoint respondeu com sucesso")
            print(f"   📊 Total de projetos: {data.get('kpis', {}).get('total_projects', 0)}")
            print(f"   💰 Orçamento total: R$ {data.get('kpis', {}).get('total_budget', 0):,.2f}")
            print(f"   💵 Realizado total: R$ {data.get('kpis', {}).get('total_realized', 0):,.2f}")
            print(f"   📈 Top projetos: {len(data.get('charts', {}).get('top_projects', []))}")
        else:
            print(f"   ❌ Endpoint retornou status {response.status_code}")
            print(f"   Resposta: {response.text[:500]}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    # 3. Testar endpoint com filtro de data
    print("\n3️⃣ Testando endpoint com filtro de data (2023-01-01)...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{base_url}/dashboard/summary?start_date=2023-01-01",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Endpoint respondeu com sucesso")
            print(f"   📊 Total de projetos: {data.get('kpis', {}).get('total_projects', 0)}")
            print(f"   💰 Orçamento total: R$ {data.get('kpis', {}).get('total_budget', 0):,.2f}")
            print(f"   💵 Realizado total: R$ {data.get('kpis', {}).get('total_realized', 0):,.2f}")
            print(f"   📈 Top projetos: {len(data.get('charts', {}).get('top_projects', []))}")
        else:
            print(f"   ❌ Endpoint retornou status {response.status_code}")
            print(f"   Resposta: {response.text[:500]}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)
    print("✅ TESTE CONCLUÍDO")
    print("=" * 70)

if __name__ == "__main__":
    try:
        testar_endpoint()
    except KeyboardInterrupt:
        print("\n\n⚠️ Teste interrompido pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro durante teste: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)



