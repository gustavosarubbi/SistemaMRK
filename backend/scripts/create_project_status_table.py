"""
Script para criar a tabela PROJECT_STATUS no banco de dados.
Execute este script se a tabela ainda não existir.
"""
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import text

def create_project_status_table():
    """Cria a tabela PROJECT_STATUS se ela não existir."""
    db = SessionLocal()
    try:
        # Verificar se a tabela já existe
        check_table = text("""
            IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PROJECT_STATUS]') AND type in (N'U'))
                SELECT 1 AS table_exists
            ELSE
                SELECT 0 AS table_exists
        """)
        result = db.execute(check_table).scalar()
        
        if result == 1:
            print("✅ Tabela PROJECT_STATUS já existe.")
            return
        
        # Criar a tabela
        create_table = text("""
            CREATE TABLE [dbo].[PROJECT_STATUS] (
                [CTT_CUSTO] NVARCHAR(50) NOT NULL PRIMARY KEY,
                [is_finalized] BIT NOT NULL DEFAULT 0,
                [finalized_at] DATETIME2 NULL,
                [finalized_by] NVARCHAR(100) NULL,
                [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
            );
            
            CREATE INDEX [IX_PROJECT_STATUS_is_finalized] ON [dbo].[PROJECT_STATUS] ([is_finalized]);
        """)
        
        db.execute(create_table)
        db.commit()
        print("✅ Tabela PROJECT_STATUS criada com sucesso!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao criar tabela PROJECT_STATUS: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Criando tabela PROJECT_STATUS...")
    create_project_status_table()
    print("Concluído!")



