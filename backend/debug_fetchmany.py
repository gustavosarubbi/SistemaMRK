import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_remote

def debug_fetchmany():
    # Codes from Escopo_Projetos.md
    cost_centers = ['001030149', '001010172', '001020300']
    table_name = "CTT010"
    custo_col = "CTT_CUSTO"
    
    placeholders = [f":c{i}" for i in range(len(cost_centers))]
    where_clause = f" WHERE {custo_col} IN ({', '.join(placeholders)})"
    query_params = {f"c{i}": c for i, c in enumerate(cost_centers)}
    
    print("Testing fetchmany with stream_results=True")
    
    with engine_remote.connect() as remote_conn:
        query = text(f"SELECT * FROM {table_name}" + where_clause)
        
        # Exact replication of sync_service logic
        result_proxy = remote_conn.execution_options(stream_results=True).execute(query, query_params)
        
        chunk_size = 10
        batch_count = 0
        total_rows = 0
        
        while True:
            rows = result_proxy.fetchmany(chunk_size)
            if not rows:
                print("No more rows.")
                break
            
            count = len(rows)
            total_rows += count
            batch_count += 1
            print(f"Batch {batch_count}: Got {count} rows")
        
        print(f"Total rows fetched: {total_rows}")

if __name__ == "__main__":
    debug_fetchmany()
