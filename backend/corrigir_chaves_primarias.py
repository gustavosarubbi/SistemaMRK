"""
Script para adicionar chaves primárias nas tabelas locais
se elas não existirem.
"""
import sys
import os
from sqlalchemy import text, inspect

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_local

def corrigir_chaves_primarias():
    print("=" * 70)
    print("🔧 CORRIGINDO CHAVES PRIMÁRIAS DAS TABELAS")
    print("=" * 70)
    
    # Mapeamento de tabelas e suas chaves primárias
    pk_map = {
        "CTT010": ["CTT_CUSTO"],
        "PAD010": ["R_E_C_N_O_"]
    }
    
    inspector = inspect(engine_local)
    
    for table_name, pk_columns in pk_map.items():
        print(f"\n📋 Verificando {table_name}...")
        
        # Verificar se a tabela existe
        if table_name not in inspector.get_table_names():
            print(f"   ⚠️ Tabela {table_name} não encontrada. Pulando...")
            continue
        
        # Verificar se já tem chave primária
        pk_constraint = inspector.get_pk_constraint(table_name)
        existing_pk = pk_constraint.get('constrained_columns', [])
        
        if existing_pk:
            print(f"   ✅ Já possui chave primária: {', '.join(existing_pk)}")
            continue
        
        # Verificar se as colunas existem
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        missing_cols = [col for col in pk_columns if col not in columns]
        
        if missing_cols:
            print(f"   ❌ Colunas de chave primária não encontradas: {', '.join(missing_cols)}")
            continue
        
        # Adicionar chave primária
        try:
            with engine_local.begin() as conn:
                # 1. Verificar e remover valores NULL nas colunas de PK
                for col in pk_columns:
                    null_count_sql = f"SELECT COUNT(*) FROM [{table_name}] WHERE [{col}] IS NULL"
                    null_count = conn.execute(text(null_count_sql)).scalar()
                    
                    if null_count > 0:
                        print(f"   ⚠️ Encontrados {null_count} valores NULL em {col}. Removendo registros...")
                        # Remover registros com NULL na coluna de PK
                        delete_sql = f"DELETE FROM [{table_name}] WHERE [{col}] IS NULL"
                        conn.execute(text(delete_sql))
                        print(f"   ✅ {null_count} registros removidos")
                
                # 2. Verificar duplicatas
                for col in pk_columns:
                    dup_sql = f"""
                    SELECT [{col}], COUNT(*) as cnt 
                    FROM [{table_name}] 
                    GROUP BY [{col}] 
                    HAVING COUNT(*) > 1
                    """
                    duplicates = conn.execute(text(dup_sql)).fetchall()
                    if duplicates:
                        print(f"   ⚠️ Encontrados {len(duplicates)} valores duplicados em {col}")
                        # Para CTT010, manter apenas o primeiro registro de cada duplicata
                        if table_name == "CTT010":
                            print(f"   🔧 Removendo duplicatas...")
                            # Manter apenas o primeiro de cada grupo
                            delete_dup_sql = f"""
                            DELETE t1 FROM [{table_name}] t1
                            INNER JOIN (
                                SELECT [{col}], MIN(ROW_NUMBER() OVER (ORDER BY [{col}])) as rn
                                FROM [{table_name}]
                                GROUP BY [{col}]
                                HAVING COUNT(*) > 1
                            ) t2 ON t1.[{col}] = t2.[{col}]
                            WHERE t1.[{col}] IN (
                                SELECT [{col}] FROM (
                                    SELECT [{col}], ROW_NUMBER() OVER (PARTITION BY [{col}] ORDER BY [{col}]) as rn
                                    FROM [{table_name}]
                                ) sub WHERE rn > 1
                            )
                            """
                            # Abordagem mais simples: deletar duplicatas mantendo apenas uma
                            # SQL Server não suporta DELETE com subquery da mesma tabela facilmente
                            # Vamos usar uma abordagem diferente
                            print(f"   ⚠️ Duplicatas encontradas. Por favor, verifique manualmente.")
                            continue
                
                # 3. Verificar se a constraint já existe
                check_sql = f"""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                WHERE TABLE_NAME = '{table_name}' 
                AND CONSTRAINT_TYPE = 'PRIMARY KEY'
                """
                has_pk = conn.execute(text(check_sql)).scalar() > 0
                
                if has_pk:
                    print(f"   ⚠️ Já existe uma constraint de chave primária. Removendo...")
                    find_constraint_sql = f"""
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE TABLE_NAME = '{table_name}' 
                    AND CONSTRAINT_TYPE = 'PRIMARY KEY'
                    """
                    constraint_result = conn.execute(text(find_constraint_sql)).fetchone()
                    if constraint_result:
                        old_constraint = constraint_result[0]
                        conn.execute(text(f"ALTER TABLE [{table_name}] DROP CONSTRAINT [{old_constraint}]"))
                
                # 4. Tornar as colunas NOT NULL
                for col in pk_columns:
                    # Verificar se já é NOT NULL
                    col_info_sql = f"""
                    SELECT IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = '{table_name}' 
                    AND COLUMN_NAME = '{col}'
                    """
                    col_info = conn.execute(text(col_info_sql)).fetchone()
                    
                    if not col_info:
                        print(f"   ⚠️ Não foi possível obter informações da coluna {col}")
                        continue
                    
                    is_nullable, data_type, max_length, precision, scale = col_info
                    
                    if is_nullable == 'YES':
                        print(f"   🔧 Tornando {col} NOT NULL...")
                        
                        # Construir o tipo da coluna
                        if data_type in ['varchar', 'nvarchar', 'char', 'nchar']:
                            if max_length and max_length > 0:
                                if max_length == -1:  # MAX
                                    col_type = f"{data_type.upper()}(MAX)"
                                else:
                                    col_type = f"{data_type.upper()}({max_length})"
                            else:
                                col_type = data_type.upper()
                        elif data_type in ['decimal', 'numeric']:
                            if precision and scale:
                                col_type = f"{data_type.upper()}({precision},{scale})"
                            else:
                                col_type = data_type.upper()
                        elif data_type == 'float':
                            if precision:
                                col_type = f"{data_type.upper()}({precision})"
                            else:
                                col_type = data_type.upper()
                        else:
                            col_type = data_type.upper()
                        
                        alter_null_sql = f"ALTER TABLE [{table_name}] ALTER COLUMN [{col}] {col_type} NOT NULL"
                        conn.execute(text(alter_null_sql))
                        print(f"   ✅ {col} agora é NOT NULL")
                
                # 5. Adicionar chave primária
                pk_cols_str = ", ".join([f"[{col}]" for col in pk_columns])
                constraint_name = f"PK_{table_name}"
                alter_sql = f"ALTER TABLE [{table_name}] ADD CONSTRAINT [{constraint_name}] PRIMARY KEY ({pk_cols_str})"
                conn.execute(text(alter_sql))
                print(f"   ✅ Chave primária adicionada: {', '.join(pk_columns)}")
                
        except Exception as e:
            print(f"   ❌ Erro ao adicionar chave primária: {e}")
            # Tentar verificar se há duplicatas que impedem a criação da PK
            if "duplicate" in str(e).lower() or "duplicate key" in str(e).lower():
                print(f"   ⚠️ Possíveis registros duplicados impedindo a criação da PK.")
                # Verificar duplicatas
                for col in pk_columns:
                    dup_sql = f"""
                    SELECT [{col}], COUNT(*) as cnt 
                    FROM [{table_name}] 
                    GROUP BY [{col}] 
                    HAVING COUNT(*) > 1
                    """
                    duplicates = conn.execute(text(dup_sql)).fetchall()
                    if duplicates:
                        print(f"   ⚠️ Encontrados {len(duplicates)} valores duplicados em {col}")
    
    print("\n" + "=" * 70)
    print("✅ CORREÇÃO CONCLUÍDA")
    print("=" * 70)

if __name__ == "__main__":
    try:
        corrigir_chaves_primarias()
    except Exception as e:
        print(f"\n❌ Erro durante correção: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

