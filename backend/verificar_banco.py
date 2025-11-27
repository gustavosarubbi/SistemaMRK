import sys
import os
from sqlalchemy import text, inspect

# Adiciona o diretório atual ao path para garantir que o app seja importado corretamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.db.session import engine_local
except ImportError:
    # Fallback caso rode de fora da pasta backend
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    from backend.app.db.session import engine_local

def check_local_table(table_name):
    print(f"\n========================================================")
    print(f"🏠 VERIFICANDO APENAS TABELA LOCAL: {table_name}")
    print(f"========================================================")
    
    print(f"Conectando ao banco LOCAL: {engine_local.url.database}...")
    
    try:
        inspector = inspect(engine_local)
        if table_name in inspector.get_table_names():
            with engine_local.connect() as conn:
                # Contagem
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
                print(f"✅ Tabela ENCONTRADA no banco local.")
                print(f"📊 Total de registros locais: {count}")
                
                # Amostra de dados
                print(f"\n📄 Amostra do primeiro registro LOCAL:")
                if 'sqlite' in str(engine_local.url):
                    sample = conn.execute(text(f"SELECT * FROM {table_name} LIMIT 1")).fetchone()
                else:
                    sample = conn.execute(text(f"SELECT TOP 1 * FROM {table_name}")).fetchone()
                
                if sample:
                    # Converter para dict para facilitar leitura
                    row_dict = dict(sample._mapping) if hasattr(sample, '_mapping') else sample
                    # Mostrar apenas alguns campos chave para não poluir a tela
                    campos_chave = ['CTT_CUSTO', 'CTT_DESC01', 'CTT_CLASSE', 'CTT_TIPO']
                    print(f"   (Mostrando campos principais)")
                    for key in row_dict:
                        if key in campos_chave or len(str(row_dict[key]).strip()) > 0:
                             if key in campos_chave: 
                                print(f"   ➡️ {key}: {row_dict[key]}")
                else:
                    print(f"⚠️ Tabela existe mas está VAZIA.")
        else:
            print(f"❌ Tabela {table_name} NÃO encontrada no banco local.")
            
    except Exception as e:
        print(f"❌ Erro ao ler banco local: {e}")

if __name__ == "__main__":
    check_local_table("CTT010")
