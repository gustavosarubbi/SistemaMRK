import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.sync_service import sync_service
from app.db.session import engine_local
from sqlalchemy import text

if __name__ == "__main__":
    print("Limpando cache da SE2010...")
    try:
        with engine_local.begin() as conn:
            conn.execute(text("DELETE FROM SYNC_CONTROL WHERE table_name = 'SE2010'"))
        print("Cache limpo.")
    except Exception as e:
        print(f"Erro ao limpar cache: {e}")
    
    print("\nSincronizando SE2010...")
    try:
        success = sync_service._sync_table_streaming("SE2010")
        if success:
            sync_service.update_sync_status("SE2010", "SUCCESS")
            print("\n✅ SE2010 sincronizada com sucesso!")
        else:
            sync_service.update_sync_status("SE2010", "ERROR")
            print("\n❌ Erro ao sincronizar SE2010.")
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()



