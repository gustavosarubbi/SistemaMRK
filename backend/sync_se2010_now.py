import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.sync_service import sync_service
from app.db.session import engine_local
from sqlalchemy import text

if __name__ == "__main__":
    table_name = "SE2010"
    
    print(f"\n{'='*60}")
    print(f"Sincronizando tabela: {table_name}")
    print(f"{'='*60}")
    
    # Limpar cache
    print(f"Limpando cache da {table_name}...")
    try:
        with engine_local.begin() as conn:
            conn.execute(text(f"DELETE FROM SYNC_CONTROL WHERE table_name = '{table_name}'"))
        print(f"Cache limpo.")
    except Exception as e:
        print(f"Erro ao limpar cache: {e}")
    
    # Sincronizar
    print(f"\nSincronizando {table_name}...")
    try:
        success = sync_service._sync_table_streaming(table_name)
        if success:
            sync_service.update_sync_status(table_name, "SUCCESS")
            print(f"\n[OK] {table_name} sincronizada com sucesso!")
        else:
            sync_service.update_sync_status(table_name, "ERROR")
            print(f"\n[ERRO] Erro ao sincronizar {table_name}.")
    except Exception as e:
        print(f"\n[ERRO] Erro ao sincronizar {table_name}: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\n{'='*60}")
    print("Concluido!")
    print(f"{'='*60}")




