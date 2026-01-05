"""
Script para criar índices de performance críticos nas tabelas.
Foca em índices que melhoram significativamente queries de filtro por data e joins.
"""
import sys
import os
from sqlalchemy import text, inspect

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine_local

def create_performance_indexes():
    print("=" * 70)
    print("🚀 CRIANDO ÍNDICES DE PERFORMANCE")
    print("=" * 70)
    
    inspector = inspect(engine_local)
    
    # Índices críticos para performance
    indices_necessarios = {
        "CTT010": [
            ("CTT_DTINI", "Índice para filtros por data de início"),
            ("CTT_DTFIM", "Índice para filtros por data de fim"),
            ("CTT_DTINI", "CTT_DTFIM", "Índice composto para queries de vigência"),
        ],
        "PAD010": [
            ("PAD_CUSTO", "Índice para joins e filtros por custo"),
        ],
        "SE2010": [
            ("E2_CUSTO", "Índice para agregações de realizado (já existe, verificando)"),
        ],
        "SC6010": [
            ("C6_CUSTO", "Índice para agregações de faturamento (já existe, verificando)"),
        ],
    }
    
    for table_name, columns_list in indices_necessarios.items():
        print(f"\n📋 Processando índices em {table_name}...")
        
        if table_name not in inspector.get_table_names():
            print(f"   ⚠️ Tabela {table_name} não encontrada")
            continue
        
        # Obter índices existentes
        existing_indexes = inspector.get_indexes(table_name)
        existing_index_names = [idx['name'] for idx in existing_indexes]
        
        # Obter colunas existentes
        columns_info = inspector.get_columns(table_name)
        existing_columns = [col['name'] for col in columns_info]
        
        for index_spec in columns_list:
            if isinstance(index_spec, tuple):
                if len(index_spec) == 2 and isinstance(index_spec[1], str):
                    # Índice simples com descrição
                    column = index_spec[0]
                    description = index_spec[1]
                    index_name = f"IX_{table_name}_{column}"
                    columns = [column]
                elif len(index_spec) == 3:
                    # Índice composto
                    col1, col2, description = index_spec
                    index_name = f"IX_{table_name}_{col1}_{col2}"
                    columns = [col1, col2]
                else:
                    # Índice simples sem descrição
                    column = index_spec[0]
                    index_name = f"IX_{table_name}_{column}"
                    columns = [column]
                    description = f"Índice em {column}"
            else:
                # String simples
                column = index_spec
                index_name = f"IX_{table_name}_{column}"
                columns = [column]
                description = f"Índice em {column}"
            
            # Verificar se o índice já existe
            if index_name in existing_index_names:
                print(f"   ✅ Índice {index_name} já existe")
                continue
            
            # Verificar se todas as colunas existem
            missing_columns = [col for col in columns if col not in existing_columns]
            if missing_columns:
                print(f"   ⚠️ Colunas não encontradas em {table_name}: {missing_columns}")
                continue
            
            # Criar índice
            try:
                with engine_local.begin() as conn:
                    columns_str = ", ".join([f"[{col}]" for col in columns])
                    create_index_sql = f"""
                    CREATE NONCLUSTERED INDEX [{index_name}] 
                    ON [{table_name}] ({columns_str})
                    """
                    conn.execute(text(create_index_sql))
                    print(f"   ✅ Índice {index_name} criado: {description}")
            except Exception as e:
                error_str = str(e).lower()
                if "already exists" in error_str or "duplicate" in error_str or "duplicate key" in error_str:
                    print(f"   ✅ Índice {index_name} já existe")
                elif "cannot create" in error_str and "because it already exists" in error_str:
                    print(f"   ✅ Índice {index_name} já existe")
                else:
                    print(f"   ❌ Erro ao criar índice {index_name}: {e}")
    
    print("\n" + "=" * 70)
    print("✅ CRIAÇÃO DE ÍNDICES CONCLUÍDA")
    print("=" * 70)
    print("\n💡 Dica: Execute este script periodicamente para garantir")
    print("   que todos os índices de performance estão criados.")

if __name__ == "__main__":
    try:
        create_performance_indexes()
    except Exception as e:
        print(f"\n❌ Erro durante criação de índices: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


