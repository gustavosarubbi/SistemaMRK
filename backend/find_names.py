import logging
from sqlalchemy import text, inspect
from app.db.session import engine_remote

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_table_exists(table_name):
    inspector = inspect(engine_remote)
    return inspector.has_table(table_name)

def inspect_sample(table_name):
    if not check_table_exists(table_name):
        logger.warning(f"Table {table_name} does not exist.")
        return

    logger.info(f"Inspecting sample for {table_name}...")
    try:
        with engine_remote.connect() as conn:
            result = conn.execute(text(f"SELECT TOP 3 * FROM {table_name}"))
            columns = result.keys()
            for row in result:
                print(f"\n--- Row in {table_name} ---")
                for col in columns:
                    val = getattr(row, col)
                    if isinstance(val, str) and len(val) > 2:
                        print(f"{col}: {val}")
    except Exception as e:
        logger.error(f"Error reading {table_name}: {e}")

if __name__ == "__main__":
    # Verificar tabelas comuns de usuários/vendedores
    print("Checking SA3010 (Vendedores/Analistas)...")
    inspect_sample("SA3010")
    
    print("\nChecking SRA010 (Funcionários)...")
    inspect_sample("SRA010")
    
    print("\nChecking Z tables (Custom)...")
    # Listar tabelas Z se possível, ou chutar nomes comuns se soubéssemos
    # Como não sabemos, vamos focar nas padrões.





