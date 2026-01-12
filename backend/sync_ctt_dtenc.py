"""
Script para sincronizar apenas a coluna CTT_DTENC da tabela CTT010.
Útil para atualizar apenas essa coluna sem fazer sync completo da tabela.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine_remote, engine_local
from sqlalchemy import text, inspect
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_ctt_dtenc():
    """Sincroniza apenas a coluna CTT_DTENC da tabela CTT010."""
    table_name = "CTT010"
    column_name = "CTT_DTENC"
    
    logger.info(f"Iniciando sincronização da coluna {column_name} da tabela {table_name}...")
    
    try:
        # 1. Verificar se a coluna existe na tabela remota
        inspector = inspect(engine_remote)
        remote_columns = inspector.get_columns(table_name)
        remote_column_names = [col['name'] for col in remote_columns]
        
        if column_name not in remote_column_names:
            logger.error(f"Coluna {column_name} não encontrada na tabela remota {table_name}")
            logger.info(f"Colunas disponíveis: {', '.join(remote_column_names)}")
            return False
        
        logger.info(f"Coluna {column_name} encontrada na tabela remota.")
        
        # 2. Verificar se a coluna existe na tabela local
        local_inspector = inspect(engine_local)
        try:
            local_columns = local_inspector.get_columns(table_name)
            local_column_names = [col['name'] for col in local_columns]
            
            if column_name not in local_column_names:
                logger.info(f"Coluna {column_name} não existe na tabela local. Adicionando...")
                # Adicionar coluna na tabela local
                with engine_local.begin() as conn:
                    conn.execute(text(f"ALTER TABLE [{table_name}] ADD [{column_name}] VARCHAR(8) NULL"))
                logger.info(f"Coluna {column_name} adicionada à tabela local.")
        except Exception as e:
            logger.warning(f"Erro ao verificar coluna local: {e}. Tentando adicionar...")
            try:
                with engine_local.begin() as conn:
                    conn.execute(text(f"ALTER TABLE [{table_name}] ADD [{column_name}] VARCHAR(8) NULL"))
                logger.info(f"Coluna {column_name} adicionada à tabela local.")
            except Exception as add_error:
                logger.error(f"Erro ao adicionar coluna: {add_error}")
                return False
        
        # 3. Buscar dados da coluna CTT_DTENC do banco remoto
        logger.info("Buscando dados do banco remoto...")
        with engine_remote.connect() as remote_conn:
            # Buscar todos os registros com CTT_CUSTO e CTT_DTENC
            query = text(f"SELECT CTT_CUSTO, [{column_name}] FROM [{table_name}] WHERE [{column_name}] IS NOT NULL AND [{column_name}] != ''")
            result = remote_conn.execute(query)
            rows = result.fetchall()
            
            logger.info(f"Encontrados {len(rows)} registros com {column_name} preenchido no banco remoto.")
        
        # 4. Atualizar registros no banco local
        if rows:
            logger.info("Atualizando registros no banco local...")
            updated_count = 0
            error_count = 0
            
            with engine_local.begin() as local_conn:
                for row in rows:
                    try:
                        ctt_custo = row[0]
                        ctt_dtenc = row[1]
                        
                        # Atualizar apenas se o valor for diferente
                        update_query = text(f"""
                            UPDATE [{table_name}] 
                            SET [{column_name}] = :dtenc 
                            WHERE CTT_CUSTO = :custo 
                            AND ([{column_name}] IS NULL OR [{column_name}] != :dtenc)
                        """)
                        result = local_conn.execute(update_query, {
                            "dtenc": ctt_dtenc,
                            "custo": ctt_custo
                        })
                        
                        if result.rowcount > 0:
                            updated_count += 1
                    except Exception as e:
                        error_count += 1
                        logger.warning(f"Erro ao atualizar registro CTT_CUSTO={row[0]}: {e}")
                        continue
            
            logger.info(f"Sincronização concluída!")
            logger.info(f"  - Registros atualizados: {updated_count}")
            logger.info(f"  - Erros: {error_count}")
            logger.info(f"  - Total processado: {len(rows)}")
            
            return True
        else:
            logger.info("Nenhum registro com CTT_DTENC preenchido encontrado no banco remoto.")
            return True
            
    except Exception as e:
        import traceback
        logger.error(f"Erro ao sincronizar {column_name}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Sincronização da coluna CTT_DTENC")
    print("="*60 + "\n")
    
    success = sync_ctt_dtenc()
    
    print("\n" + "="*60)
    if success:
        print("Sincronização concluída com sucesso!")
    else:
        print("Sincronização falhou. Verifique os logs acima.")
    print("="*60 + "\n")
    
    sys.exit(0 if success else 1)



