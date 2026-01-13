import sys
import os

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.sync_service import sync_service

if __name__ == "__main__":
    print("Initializing Manual Sync (Forced)...")
    success = sync_service.sync_all(force=True)
    if success:
        print("Sync finished successfully.")
        sys.exit(0)
    else:
        print("Sync failed.")
        sys.exit(1)

