import os
import pyodbc
from dotenv import load_dotenv

import sys
import os

# Add backend directory to path so we can import app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import engine_audit, engine_local
from app.models.audit import OFXTransaction, Base as AuditBase
from app.models.validation import ValidationStatus, Base as ValidationBase

load_dotenv()

def create_audit_db():
    server = os.getenv("LOCAL_DB_SERVER", "localhost")
    user = os.getenv("LOCAL_DB_USER")
    password = os.getenv("LOCAL_DB_PASSWORD")
    port = os.getenv("LOCAL_DB_PORT", "1433")
    audit_db_name = os.getenv("LOCAL_DB_NAME_AUDIT", "SistemaMRK_Audit")

    if not user or not password:
        print("Error: LOCAL_DB_USER or LOCAL_DB_PASSWORD not found in .env")
        return

    # Connection string to master to create new database
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={server},{port};"
        f"DATABASE=master;"
        f"UID={user};"
        f"PWD={password};"
        f"Encrypt=no;"
        f"TrustServerCertificate=yes;"
    )

    try:
        # Connect with autocommit=True to execute CREATE DATABASE
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(f"SELECT name FROM sys.databases WHERE name = '{audit_db_name}'")
        if cursor.fetchone():
            print(f"Database '{audit_db_name}' already exists.")
        else:
            print(f"Creating database '{audit_db_name}'...")
            cursor.execute(f"CREATE DATABASE [{audit_db_name}]")
            print(f"Database '{audit_db_name}' created successfully.")

        cursor.close()
        conn.close()

        # Step 2: Create Tables using SQLAlchemy
        print("Creating tables in Audit database...")
        AuditBase.metadata.create_all(engine_audit)
        print("Audit tables created successfully.")

        print("Ensuring validation tables exist in Local database...")
        ValidationBase.metadata.create_all(engine_local)
        print("Validation tables checked.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_audit_db()
