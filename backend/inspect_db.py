import logging
# import pandas as pd
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

def inspect_data_sample(table_name, limit=10):
    logger.info(f"Inspecting extended sample for table: {table_name}")
    try:
        # Get rows where CTT_ANALIS is NOT empty to see what matches
        query = f"SELECT TOP {limit} * FROM {table_name} WHERE CTT_ANALIS <> '' AND CTT_ANALIS IS NOT NULL"
        with engine_remote.connect() as conn:
            result = conn.execute(text(query))
            rows = [dict(row._mapping) for row in result]
            
        if rows:
            logger.info(f"Found {len(rows)} rows with ANALIS data:")
            for i, row in enumerate(rows):
                print(f"\nRow {i+1}:")
                # Print potential name columns
                cols_to_check = ['CTT_ANALIS', 'CTT_ANADES', 'CTT_NOMECO', 'CTT_COORDE', 'CTT_NOMORG', 'CTT_NOME', 'CTT_USERGA', 'CTT_DESC01']
                for key in cols_to_check:
                    if key in row:
                        print(f"  {key}: {row[key]}")
        else:
            logger.warning(f"No rows found with CTT_ANALIS populated.")
            
    except Exception as e:
        logger.error(f"Error inspecting data: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("CHECKING CTT010 FOR NAMES")
    print("=" * 50)
    inspect_data_sample("CTT010", limit=5)



