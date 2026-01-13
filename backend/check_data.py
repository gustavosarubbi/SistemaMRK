from app.db.session import SessionLocal
from sqlalchemy import text
import sys

def check():
    db = SessionLocal()
    try:
        print("--- SC6010 (Faturamento) ---")
        res = db.execute(text("SELECT COUNT(*) FROM SC6010")).fetchone()
        print(f"Total rows: {res[0]}")
        
        res = db.execute(text("SELECT COUNT(*) FROM SC6010 WHERE D_E_L_E_T_ != '*'")).fetchone()
        print(f"Active rows (D_E_L_E_T_ != '*'): {res[0]}")
        
        # Check column names
        keys_sc6 = db.execute(text("SELECT TOP 0 * FROM SC6010")).keys()
        print(f"Columns in SC6010: {list(keys_sc6)}")
        
        res = db.execute(text("SELECT MIN(C6_DATFAT), MAX(C6_DATFAT) FROM SC6010 WHERE D_E_L_E_T_ != '*'")).fetchone()
        print(f"Date range (C6_DATFAT): {res[0]} to {res[1]}")
        
        res = db.execute(text("SELECT COUNT(*) FROM SC6010 WHERE C6_DATFAT >= '20230101' AND D_E_L_E_T_ != '*'")).fetchone()
        print(f"Rows >= 20230101: {res[0]}")
        
        print("\n--- SE1010 (Recebíveis) ---")
        res = db.execute(text("SELECT COUNT(*) FROM SE1010")).fetchone()
        print(f"Total rows: {res[0]}")
        
        # Check column names
        keys = db.execute(text("SELECT TOP 0 * FROM SE1010")).keys()
        print(f"Columns in SE1010: {list(keys)}")
        
        print("\n--- Sample Rows (SC6010) ---")
        res = db.execute(text("SELECT TOP 5 C6_CUSTO, C6_NOTA, C6_DATFAT, C6_VALOR FROM SC6010 WHERE D_E_L_E_T_ != '*' AND C6_DATFAT >= '20230101'")).fetchall()
        for row in res:
            print(row)
            
    finally:
        db.close()

if __name__ == "__main__":
    check()
