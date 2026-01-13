import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_remote

def inspect_remote():
    print("Sample from CTT010 (Remote):")
    with engine_remote.connect() as conn:
        result = conn.execute(text("SELECT TOP 10 CTT_CUSTO, CTT_DESC01 FROM CTT010")).fetchall()
        for row in result:
            print(f"Custo: '{row[0]}', Desc: '{row[1]}'")

if __name__ == "__main__":
    inspect_remote()
