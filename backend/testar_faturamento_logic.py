import sys
import os

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.faturamento_service import faturamento_service

def test_faturamento():
    db = SessionLocal()
    try:
        print("Buscando dados de faturamento...")
        data = faturamento_service.get_faturamento_data(db)
        
        print(f"Total de itens encontrados: {len(data)}")
        
        if len(data) > 0:
            print("\nPrimeiros 5 itens:")
            for item in data[:5]:
                print(f"- Projeto: {item['projeto_nome']} ({item['custo']})")
                print(f"  Item: {item['item']} | Valor: {item['valor']} | Nota: {item['nota']}")
                print(f"  Status: {item['status']}")
                print("-" * 30)
            
            # Count statuses
            stats = {}
            for item in data:
                stats[item['status']] = stats.get(item['status'], 0) + 1
            
            print("\nEstatísticas:")
            for status, count in stats.items():
                print(f"- {status}: {count}")
        else:
            print("Nenhum dado encontrado nas tabelas SC6010/SE1010.")
            
    except Exception as e:
        print(f"Erro no teste: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_faturamento()
