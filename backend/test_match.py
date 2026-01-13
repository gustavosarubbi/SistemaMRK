import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_remote

def test_match():
    # Use one of the codes from Escopo_Projetos.md
    test_code = '001030149'
    print(f"Testing match for code: '{test_code}'")
    
    with engine_remote.connect() as conn:
        # Test without RTRIM
        count_no_trim = conn.execute(text(f"SELECT COUNT(*) FROM CTT010 WHERE CTT_CUSTO = :c"), {"c": test_code}).scalar()
        print(f"Match count (no trim): {count_no_trim}")
        
        # Test with RTRIM
        count_trim = conn.execute(text(f"SELECT COUNT(*) FROM CTT010 WHERE RTRIM(CTT_CUSTO) = :c"), {"c": test_code}).scalar()
        print(f"Match count (with RTRIM): {count_trim}")
        
        # Test with LIKE
        count_like = conn.execute(text(f"SELECT COUNT(*) FROM CTT010 WHERE CTT_CUSTO LIKE :c"), {"c": f"%{test_code}%"}).scalar()
        print(f"Match count (with LIKE): {count_like}")

if __name__ == "__main__":
    test_match()
