import sys
import os
from sqlalchemy import text, inspect

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.session import engine_local

def check_tables():
    inspector = inspect(engine_local)
    tables = inspector.get_table_names()
    
    target_tables = ["SE1010", "CTT010", "SE2010", "SC6010"]
    
    print("Checking tables...")
    for t in target_tables:
        exists = t in tables
        print(f"Table {t}: {'EXISTS' if exists else 'MISSING'}")
        
    if "SE1010" in tables:
        print("\nColumns in SE1010:")
        columns = [c['name'] for c in inspector.get_columns("SE1010")]
        print(columns)

if __name__ == "__main__":
    check_tables()
