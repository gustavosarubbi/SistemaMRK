import sys
import os
import time

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.faturamento_service import faturamento_service

def test_performance():
    db = SessionLocal()
    try:
        print("Testando performance do FaturamentoService...")
        start_time = time.time()
        
        # Default filter: 2023-01-01
        data = faturamento_service.get_faturamento_data(db, start_date="20230101")
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"Total de itens recuperados: {len(data)}")
        print(f"Tempo total de execução: {duration:.2f} segundos")
        
        if duration > 10:
            print("AVISO: A consulta está excessivamente lenta (> 10s).")
            print("Provável causa: N+1 queries (loop de consultas à SE1010).")
            
    except Exception as e:
        print(f"Erro no teste: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_performance()
