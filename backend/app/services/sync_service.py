import logging
from datetime import datetime, timedelta
from sqlalchemy import text, inspect, Table, MetaData, Column, String, Integer, DateTime
from app.db.session import engine_remote, engine_local

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self.tables = ["CTT010", "PAC010", "PAD010"]
        self.control_table = "SYNC_CONTROL"
        self._ensure_control_table()

    def _ensure_control_table(self):
        """Create sync control table if not exists."""
        try:
            metadata = MetaData()
            control = Table(
                self.control_table, metadata,
                Column('table_name', String(50), primary_key=True),
                Column('last_sync', DateTime),
                Column('status', String(20))
            )
            metadata.create_all(engine_local)
        except Exception as e:
            logger.warning(f"Could not ensure control table: {e}")

    def should_sync(self, table_name: str, cache_duration_minutes: int = 60) -> bool:
        """Check if table needs sync based on last update time."""
        try:
            query = text(f"SELECT last_sync FROM {self.control_table} WHERE table_name = :table AND status = 'SUCCESS'")
            with engine_local.connect() as conn:
                result = conn.execute(query, {"table": table_name}).scalar()
            
            if not result:
                return True # Never synced
            
            # If last sync was older than cache_duration
            if datetime.now() - result > timedelta(minutes=cache_duration_minutes):
                return True
                
            logger.info(f"Skipping sync for {table_name}: Cache valid until {result + timedelta(minutes=cache_duration_minutes)}")
            return False
        except Exception as e:
            logger.error(f"Error checking sync status: {e}")
            return True # Default to sync on error

    def update_sync_status(self, table_name: str, status: str):
        """Update the sync timestamp."""
        try:
            # Upsert logic for SQL Server (Merge or simple check+update)
            # Simplest: Delete + Insert
            with engine_local.begin() as conn:
                conn.execute(text(f"DELETE FROM {self.control_table} WHERE table_name = :table"), {"table": table_name})
                conn.execute(
                    text(f"INSERT INTO {self.control_table} (table_name, last_sync, status) VALUES (:table, :time, :status)"),
                    {"table": table_name, "time": datetime.now(), "status": status}
                )
        except Exception as e:
            logger.error(f"Error updating sync status: {e}")

    def sync_all(self, force: bool = False):
        logger.info("Starting Sync Process (Smart Cache)...")
        
        try:
            for table_name in self.tables:
                if force or self.should_sync(table_name, cache_duration_minutes=60 * 24): # 24h cache by default
                    success = self._sync_table_streaming(table_name)
                    if success:
                        self.update_sync_status(table_name, "SUCCESS")
                    else:
                        self.update_sync_status(table_name, "ERROR")
                
            logger.info("Synchronization process finished.")
            return True
        except Exception as e:
            logger.error(f"Synchronization failed: {e}")
            return False

    def _sync_table_streaming(self, table_name: str):
        logger.info(f"Syncing table {table_name} (Streaming Mode)...")
        
        try:
            # 1. Discover Remote Schema
            inspector = inspect(engine_remote)
            columns = inspector.get_columns(table_name)
            
            if not columns:
                logger.warning(f"Table {table_name} not found or empty schema on remote.")
                return False

            logger.info(f"Discovered {len(columns)} columns for {table_name}.")
            
            # Get primary key information from remote
            pk_constraint = inspector.get_pk_constraint(table_name)
            pk_columns = set(pk_constraint.get('constrained_columns', []))
            
            if pk_columns:
                logger.info(f"Found primary key columns: {', '.join(pk_columns)}")
            else:
                # Fallback: Use model definitions for primary keys
                from app.models.protheus import CTT010, PAC010, PAD010
                pk_map = {
                    "CTT010": ["CTT_CUSTO"],
                    "PAC010": ["R_E_C_N_O_"],
                    "PAD010": ["R_E_C_N_O_"]
                }
                if table_name in pk_map:
                    pk_columns = set(pk_map[table_name])
                    logger.info(f"Using model-defined primary key: {', '.join(pk_columns)}")
            
            # 2. Recreate Local Table
            local_metadata = MetaData()
            safe_columns = []
            for col in columns:
                col_name = col['name']
                col_type = col['type']
                is_primary = col_name in pk_columns
                safe_columns.append(Column(col_name, col_type, primary_key=is_primary, autoincrement=False))

            local_table = Table(table_name, local_metadata, *safe_columns)
            
            # Drop and Create
            local_metadata.drop_all(engine_local)
            local_metadata.create_all(engine_local)
            
            # 3. Stream Data
            col_names = [c.name for c in local_table.columns]
            placeholders = ", ".join([f":{c}" for c in col_names])
            cols_str = ", ".join([f"[{c}]" for c in col_names])
            insert_sql = f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})"
            
            chunk_size = 10000
            total_rows = 0
            
            with engine_remote.connect() as remote_conn:
                result_proxy = remote_conn.execution_options(stream_results=True).execute(text(f"SELECT * FROM {table_name}"))
                
                with engine_local.begin() as local_conn:
                    while True:
                        rows = result_proxy.fetchmany(chunk_size)
                        if not rows:
                            break
                        
                        data_to_insert = [dict(zip(col_names, row)) for row in rows]
                        local_conn.execute(text(insert_sql), data_to_insert)
                        total_rows += len(rows)
                        logger.info(f"Synced {total_rows} rows for {table_name}...")
            
            logger.info(f"Finished syncing {table_name}. Total: {total_rows}")
            return True

        except Exception as e:
            logger.error(f"Error syncing {table_name}: {e}")
            return False

sync_service = SyncService()
