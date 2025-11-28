"""
Script para testar se a API está respondendo corretamente
"""
import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def testar_api():
    base_url = "http://localhost:8000/api"
    
    print("=" * 70)
    print("🧪 TESTANDO CONEXÃO DA API")
    print("=" * 70)
    
    # 1. Testar se a API está rodando
    print("\n1️⃣ Testando se a API está rodando...")
    try:
        response = requests.get(f"{base_url}/docs", timeout=5)
        if response.status_code == 200:
            print("   ✅ API está rodando e acessível")
        else:
            print(f"   ⚠️ API respondeu com status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ ERRO: Não foi possível conectar à API")
        print("   💡 Verifique se o backend está rodando:")
        print("      python backend/run_api.py")
        return False
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False
    
    # 2. Testar login
    print("\n2️⃣ Testando endpoint de login...")
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
            if token:
                print("   ✅ Login funcionando, token obtido")
                print(f"   📝 Token: {token[:20]}...")
            else:
                print("   ⚠️ Login retornou 200 mas sem token")
                return False
        else:
            print(f"   ❌ Login falhou com status {response.status_code}")
            print(f"   Resposta: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Erro no login: {e}")
        return False
    
    # 3. Testar endpoint de projetos (sem autenticação primeiro)
    print("\n3️⃣ Testando endpoint de projetos (sem autenticação)...")
    try:
        response = requests.get(f"{base_url}/projects?page=1&limit=5", timeout=5)
        if response.status_code == 401:
            print("   ✅ Endpoint protegido (retorna 401 sem autenticação)")
        else:
            print(f"   ⚠️ Endpoint retornou status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    # 4. Testar endpoint de projetos COM autenticação
    print("\n4️⃣ Testando endpoint de projetos (com autenticação)...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{base_url}/projects?page=1&limit=5",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Endpoint de projetos funcionando!")
            print(f"   📊 Total de projetos: {data.get('total', 0)}")
            print(f"   📄 Projetos retornados: {len(data.get('data', []))}")
            if data.get('data'):
                print(f"   📋 Primeiro projeto: {data['data'][0].get('CTT_CUSTO', 'N/A')}")
        else:
            print(f"   ❌ Endpoint retornou status {response.status_code}")
            print(f"   Resposta: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 5. Testar endpoint de dashboard
    print("\n5️⃣ Testando endpoint de dashboard...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{base_url}/dashboard/summary",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Endpoint de dashboard funcionando!")
            print(f"   📊 KPIs: {data.get('kpis', {})}")
        else:
            print(f"   ❌ Endpoint retornou status {response.status_code}")
            print(f"   Resposta: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    print("\n" + "=" * 70)
    print("✅ TESTES CONCLUÍDOS")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        testar_api()
    except KeyboardInterrupt:
        print("\n\n⚠️ Teste interrompido pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro durante teste: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

