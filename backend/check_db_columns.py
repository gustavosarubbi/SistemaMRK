from sqlalchemy import create_engine, inspect
import sys

# Connect to the SQLite database
# Note: In production code we get this from config, but here we hardcode for the check script
DATABASE_URL = "sqlite:///./audit.db"
engine = create_engine(DATABASE_URL)

inspector = inspect(engine)
columns = inspector.get_columns('OFX_TRANSACTIONS')

found = False
for column in columns:
    if column['name'] == 'check_num':
        print(f"Column 'check_num' found: {column}")
        found = True
        break

if not found:
    print("Column 'check_num' NOT found.")
    all_cols = [c['name'] for c in columns]
    print(f"Available columns: {all_cols}")
