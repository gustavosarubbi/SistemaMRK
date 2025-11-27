import sys
import os

# Robustly add backend to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, "backend")
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.services.sync_service import sync_service

if __name__ == "__main__":
    print("Forcing Manual Sync...")
    # Force sync ignores the cache check
    success = sync_service.sync_all(force=True)
    if success:
        print("Sync finished successfully.")
        sys.exit(0)
    else:
        print("Sync failed.")
        sys.exit(1)

