"""
Script para testar se os endpoints estão funcionando corretamente
"""
import sys
import os
import requests
import json

def testar_api():
    base_url = "http://localhost:8000/api"
    
    print("=" * 70)
    print("🧪 TESTANDO ENDPOINTS DA API")
    print("=" * 70)
    
    # 1. Verificar se a API está rodando
    print("\n1️⃣ Verificando se a API está rodando...")
    try:
        response = requests.get(f"{base_url}/docs", timeout=3)
        if response.status_code == 200:
            print("   ✅ API está rodando")
        else:
            print(f"   ⚠️ API respondeu com status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ ERRO: API não está rodando!")
        print("   💡 Inicie a API com: python backend/run_api.py")
        return False
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False
    
    # 2. Fazer login
    print("\n2️⃣ Fazendo login...")
    try:
        login_data = {"username": "admin", "password": "admin"}
        response = requests.post(f"{base_url}/auth/login", data=login_data, timeout=5)
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            print("   ✅ Login realizado com sucesso")
        else:
            print(f"   ❌ Login falhou: {response.status_code}")
            print(f"   Resposta: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Erro no login: {e}")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Testar endpoint de projetos
    print("\n3️⃣ Testando endpoint /projects...")
    try:
        response = requests.get(
            f"{base_url}/projects?page=1&limit=5",
            headers=headers,
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Endpoint respondeu")
            print(f"   📊 Total: {data.get('total', 0)}")
            print(f"   📄 Projetos retornados: {len(data.get('data', []))}")
            
            if data.get('data'):
                first = data['data'][0]
                print(f"   📋 Primeiro projeto: {first.get('CTT_CUSTO', 'N/A')}")
        else:
            print(f"   ❌ Erro: {response.status_code}")
            print(f"   Resposta: {response.text[:500]}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    # 4. Testar endpoint do dashboard
    print("\n4️⃣ Testando endpoint /dashboard/summary...")
    try:
        response = requests.get(
            f"{base_url}/dashboard/summary?start_date=2023-01-01",
            headers=headers,
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Endpoint respondeu")
            kpis = data.get('kpis', {})
            print(f"   📊 Total de projetos: {kpis.get('total_projects', 0)}")
            print(f"   💰 Orçamento: R$ {kpis.get('total_budget', 0):,.2f}")
            print(f"   💵 Realizado: R$ {kpis.get('total_realized', 0):,.2f}")
        else:
            print(f"   ❌ Erro: {response.status_code}")
            print(f"   Resposta: {response.text[:500]}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)
    print("✅ TESTE CONCLUÍDO")
    print("=" * 70)

if __name__ == "__main__":
    testar_api()










