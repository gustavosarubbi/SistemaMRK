"""
Script para verificar e criar índices nas tabelas para melhorar performance
"""
import sys
import os
from sqlalchemy import text, inspect

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_local

def verificar_e_criar_indices():
    print("=" * 70)
    print("🔍 VERIFICANDO E CRIANDO ÍNDICES")
    print("=" * 70)
    
    inspector = inspect(engine_local)
    
    # Índices necessários para performance
    indices_necessarios = {
        "PAD010": ["PAD_CUSTO"]
    }
    
    for table_name, columns in indices_necessarios.items():
        print(f"\n📋 Verificando índices em {table_name}...")
        
        if table_name not in inspector.get_table_names():
            print(f"   ⚠️ Tabela {table_name} não encontrada")
            continue
        
        # Obter índices existentes
        existing_indexes = inspector.get_indexes(table_name)
        existing_index_names = [idx['name'] for idx in existing_indexes]
        
        for column in columns:
            index_name = f"IX_{table_name}_{column}"
            
            # Verificar se o índice já existe
            if index_name in existing_index_names:
                print(f"   ✅ Índice {index_name} já existe")
                continue
            
            # Verificar se a coluna existe
            columns_info = inspector.get_columns(table_name)
            column_exists = any(col['name'] == column for col in columns_info)
            
            if not column_exists:
                print(f"   ⚠️ Coluna {column} não encontrada em {table_name}")
                continue
            
            # Criar índice
            try:
                with engine_local.begin() as conn:
                    create_index_sql = f"""
                    CREATE NONCLUSTERED INDEX [{index_name}] 
                    ON [{table_name}] ([{column}])
                    """
                    conn.execute(text(create_index_sql))
                    print(f"   ✅ Índice {index_name} criado com sucesso")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"   ✅ Índice {index_name} já existe")
                else:
                    print(f"   ❌ Erro ao criar índice {index_name}: {e}")
    
    print("\n" + "=" * 70)
    print("✅ VERIFICAÇÃO CONCLUÍDA")
    print("=" * 70)

if __name__ == "__main__":
    try:
        verificar_e_criar_indices()
    except Exception as e:
        print(f"\n❌ Erro durante verificação: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)









