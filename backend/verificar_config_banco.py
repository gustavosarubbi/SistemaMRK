"""
Script para verificar a configuração do banco de dados
e confirmar que está puxando das tabelas locais corretas.
"""
import sys
import os
from sqlalchemy import text, inspect

# Adiciona o diretório atual ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.session import engine_local, engine_remote, SessionLocal
from app.models.protheus import CTT010, PAC010, PAD010

def verificar_configuracao():
    print("=" * 70)
    print("🔍 VERIFICAÇÃO DE CONFIGURAÇÃO DO BANCO DE DADOS")
    print("=" * 70)
    
    # 1. Verificar configurações
    print("\n📋 CONFIGURAÇÕES:")
    print(f"   Banco Local - Servidor: {settings.LOCAL_DB_SERVER}")
    print(f"   Banco Local - Porta: {settings.LOCAL_DB_PORT}")
    print(f"   Banco Local - Nome: {settings.LOCAL_DB_NAME}")
    print(f"   Banco Local - Usuário: {settings.LOCAL_DB_USER}")
    print(f"   Banco Remoto - Servidor: {settings.DB_SERVER}")
    print(f"   Banco Remoto - Nome: {settings.DB_NAME}")
    
    # 2. Verificar conexão local
    print("\n🔌 TESTANDO CONEXÃO LOCAL:")
    try:
        with engine_local.connect() as conn:
            result = conn.execute(text("SELECT DB_NAME() as db_name, @@SERVERNAME as server_name"))
            row = result.fetchone()
            if row:
                print(f"   ✅ Conectado ao banco: {row[0]}")
                print(f"   ✅ Servidor: {row[1]}")
            else:
                print("   ⚠️ Conectado mas não foi possível obter informações")
    except Exception as e:
        print(f"   ❌ Erro ao conectar: {e}")
        return False
    
    # 3. Verificar tabelas locais
    print("\n📊 VERIFICANDO TABELAS LOCAIS:")
    tabelas_esperadas = ["CTT010", "PAC010", "PAD010"]
    inspector = inspect(engine_local)
    tabelas_existentes = inspector.get_table_names()
    
    for tabela in tabelas_esperadas:
        if tabela in tabelas_existentes:
            try:
                with engine_local.connect() as conn:
                    count = conn.execute(text(f"SELECT COUNT(*) FROM {tabela}")).scalar()
                    print(f"   ✅ {tabela}: {count} registros")
            except Exception as e:
                print(f"   ⚠️ {tabela}: Erro ao contar registros - {e}")
        else:
            print(f"   ❌ {tabela}: Tabela não encontrada no banco local!")
    
    # 4. Verificar se SessionLocal está usando o banco correto
    print("\n🔍 VERIFICANDO SESSÃO LOCAL (usada pela API):")
    try:
        db = SessionLocal()
        # Testar uma query simples
        result = db.execute(text("SELECT DB_NAME() as db_name"))
        row = result.fetchone()
        if row:
            db_name = row[0]
            print(f"   ✅ SessionLocal está conectado ao banco: {db_name}")
            if db_name != settings.LOCAL_DB_NAME:
                print(f"   ⚠️ ATENÇÃO: Esperado '{settings.LOCAL_DB_NAME}', mas está em '{db_name}'")
            else:
                print(f"   ✅ Banco correto confirmado!")
        
        # Testar query nas tabelas usando os modelos
        print("\n📋 TESTANDO QUERIES COM OS MODELOS:")
        count_ctt = db.query(CTT010).count()
        print(f"   ✅ CTT010 (via modelo): {count_ctt} registros")
        
        count_pac = db.query(PAC010).count()
        print(f"   ✅ PAC010 (via modelo): {count_pac} registros")
        
        count_pad = db.query(PAD010).count()
        print(f"   ✅ PAD010 (via modelo): {count_pad} registros")
        
        db.close()
    except Exception as e:
        print(f"   ❌ Erro ao testar SessionLocal: {e}")
        return False
    
    # 5. Verificar estrutura das tabelas
    print("\n🏗️ VERIFICANDO ESTRUTURA DAS TABELAS:")
    for tabela in tabelas_esperadas:
        if tabela in tabelas_existentes:
            try:
                columns = inspector.get_columns(tabela)
                pk_constraint = inspector.get_pk_constraint(tabela)
                pk_cols = pk_constraint.get('constrained_columns', [])
                
                print(f"\n   📋 {tabela}:")
                print(f"      Colunas: {len(columns)}")
                if pk_cols:
                    print(f"      Chave Primária: {', '.join(pk_cols)}")
                else:
                    print(f"      ⚠️ Nenhuma chave primária encontrada")
            except Exception as e:
                print(f"   ⚠️ Erro ao verificar estrutura de {tabela}: {e}")
    
    print("\n" + "=" * 70)
    print("✅ VERIFICAÇÃO CONCLUÍDA")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        verificar_configuracao()
    except Exception as e:
        print(f"\n❌ Erro durante verificação: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)




