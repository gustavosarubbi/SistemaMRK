import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "audit.db")

def migrate():
    print(f"Migrating database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(OFX_TRANSACTIONS)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "balance" not in columns:
            print("Adding 'balance' column...")
            cursor.execute("ALTER TABLE OFX_TRANSACTIONS ADD COLUMN balance REAL")
            print("Column added successfully.")
        else:
            print("'balance' column already exists.")
            
        conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
