import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_cost_centers():
    """Load cost centers from Escopo_Projetos.md in root directory."""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # app/services -> app -> backend -> root
        # Wait, if this script is in backend/, then root is one level up.
        # But if it's in backend/app/services/, root is 3 levels up.
        
        # In the real sync_service.py, current_dir is app/services/
        # so root is 3 levels up.
        
        # Let's just find the file starting from current dir and going up
        temp_dir = current_dir
        file_path = None
        for _ in range(5):
            check_path = os.path.join(temp_dir, "Escopo_Projetos.md")
            if os.path.exists(check_path):
                file_path = check_path
                break
            temp_dir = os.path.dirname(temp_dir)
        
        if not file_path:
            print(f"File not found starting from {current_dir}")
            return []
            
        print(f"Found file at: {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        print(f"File content length: {len(content)}")
        lines = content.splitlines()
        print(f"Number of lines: {len(lines)}")
        
        centers = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            
            clean_line = line
            if line.startswith("- "):
                clean_line = line[2:].strip()
            
            parts = clean_line.replace(",", " ").split()
            for p in parts:
                p_clean = p.strip()
                if p_clean:
                    centers.append(p_clean)
        
        unique_centers = sorted(list(set(centers)))
        print(f"Loaded {len(unique_centers)} cost centers")
        print(f"Sample: {unique_centers[:5]}")
        return unique_centers
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    load_cost_centers()
