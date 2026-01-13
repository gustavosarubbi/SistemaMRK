import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_local

def check_counts():
    tables = ['CTT010', 'PAD010', 'SC6010', 'SE1010', 'SE2010']
    print("Record counts in local database:")
    with engine_local.connect() as conn:
        for t in tables:
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
                print(f"{t}: {count} rows")
            except Exception as e:
                print(f"{t}: Error - {e}")

if __name__ == "__main__":
    check_counts()
