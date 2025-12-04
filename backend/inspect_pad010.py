import logging
from sqlalchemy import text
from app.db.session import engine_remote

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def inspect_columns(table_name):
    logger.info(f"Inspecting columns for table: {table_name}")
    try:
        # Query to get column names from Information Schema (works on SQL Server)
        query = f"""
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '{table_name}'
        ORDER BY COLUMN_NAME
        """
        with engine_remote.connect() as conn:
            result = conn.execute(text(query))
            columns = [row[0] for row in result]
            
        if columns:
            logger.info(f"Found {len(columns)} columns in {table_name}:")
            print(f"\nColumns in {table_name}:")
            for col in columns:
                print(f"- {col}")
        else:
            logger.warning(f"No columns found for {table_name}. Table might not exist or permissions issue.")
            
    except Exception as e:
        logger.error(f"Error inspecting {table_name}: {e}")

if __name__ == "__main__":
    inspect_columns("PAD010")


