import sys
import os
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.sync_service import SyncService
from app.db.session import engine_remote

def check_loaded_values():
    service = SyncService()
    centers = service.load_cost_centers()
    
    print(f"Loaded {len(centers)} centers.")
    if not centers:
        print("No centers loaded!")
        return

    # Pick a known existing center
    target = '001030149' 
    
    if target in centers:
        print(f"Target '{target}' IS in loaded list.")
        
        # Get the actual value from the list
        actual_value = [c for c in centers if c == target][0]
        print(f"Actual value from list: '{actual_value}' (Type: {type(actual_value)})")
        print(f"Repr: {repr(actual_value)}")
        
        # Test query with this specific value object
        with engine_remote.connect() as conn:
            query = text("SELECT COUNT(*) FROM CTT010 WHERE CTT_CUSTO = :c")
            count = conn.execute(query, {"c": actual_value}).scalar()
            print(f"Query with actual value returned: {count} rows")
    else:
        print(f"Target '{target}' is NOT in loaded list.")
        print(f"First 5 loaded: {[repr(c) for c in centers[:5]]}")

if __name__ == "__main__":
    check_loaded_values()
