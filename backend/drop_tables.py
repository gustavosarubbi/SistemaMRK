import sys
import os
from sqlalchemy import text, inspect

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_local, engine_audit

def drop_all_tables():
    print("Starting cleanup of local databases...")
    
    # Tables to drop in local DB
    local_tables = ["CTT010", "PAD010", "SC6010", "SE1010", "SE2010", "SYNC_CONTROL", "PROJECT_STATUS"]
    
    print("\n--- Cleaning SistemaMRK_Local ---")
    try:
        with engine_local.begin() as conn:
            inspector = inspect(engine_local)
            existing_tables = inspector.get_table_names()
            
            for table in local_tables:
                if table in existing_tables:
                    print(f"Dropping table {table} from local DB...")
                    conn.execute(text(f"DROP TABLE [{table}]"))
                else:
                    print(f"Table {table} does not exist in local DB.")
        print("Local DB cleanup finished.")
    except Exception as e:
        print(f"Error cleaning local DB: {e}")

    print("\n--- Cleaning SistemaMRK_Audit ---")
    try:
        # For Audit (SQLite), we can just drop the known tables
        audit_tables = ["OFX_TRANSACTIONS"]
        with engine_audit.begin() as conn:
            inspector = inspect(engine_audit)
            existing_tables = inspector.get_table_names()
            
            for table in audit_tables:
                if table in existing_tables:
                    print(f"Dropping table {table} from audit DB...")
                    conn.execute(text(f"DROP TABLE {table}"))
                else:
                    print(f"Table {table} does not exist in audit DB.")
        print("Audit DB cleanup finished.")
    except Exception as e:
        print(f"Error cleaning audit DB: {e}")

if __name__ == "__main__":
    drop_all_tables()
    print("\nCleanup process complete.")
