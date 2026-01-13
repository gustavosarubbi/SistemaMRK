import sys
import os
from sqlalchemy import text, inspect

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_remote

def simulate_sync():
    # Codes from Escopo_Projetos.md
    cost_centers = ['001030149', '001010172', '001020300']
    table_name = "CTT010"
    custo_col = "CTT_CUSTO"
    
    placeholders = [f":c{i}" for i in range(len(cost_centers))]
    where_clause = f" WHERE {custo_col} IN ({', '.join(placeholders)})"
    query_params = {f"c{i}": c for i, c in enumerate(cost_centers)}
    
    query_str = f"SELECT COUNT(*) FROM {table_name}" + where_clause
    print(f"Running query: {query_str}")
    print(f"Params: {query_params}")
    
    with engine_remote.connect() as conn:
        try:
            count = conn.execute(text(query_str), query_params).scalar()
            print(f"Result count: {count}")
            
            # Try with single item
            one_param = {"c0": cost_centers[0]}
            one_query = f"SELECT COUNT(*) FROM {table_name} WHERE {custo_col} = :c0"
            count_one = conn.execute(text(one_query), one_param).scalar()
            print(f"Single match count: {count_one}")
            
        except Exception as e:
            print(f"Query level error: {e}")

if __name__ == "__main__":
    simulate_sync()
