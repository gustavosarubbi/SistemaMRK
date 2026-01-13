import logging
from datetime import datetime, timedelta
from sqlalchemy import text, inspect, Table, MetaData, Column, String, Integer, DateTime, Float, Numeric
from app.db.session import engine_remote, engine_local

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self.tables = ["CTT010", "PAD010", "SC6010", "SE1010", "SE2010"]
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
                from app.models.protheus import CTT010, PAD010, SC6010, SE1010, SE2010
                pk_map = {
                    "CTT010": ["CTT_CUSTO"],
                    "PAD010": ["R_E_C_N_O_"],
                    "SC6010": ["R_E_C_N_O_"],
                    "SE1010": ["R_E_C_N_O_"],
                    "SE2010": ["R_E_C_N_O_"]
                }
                if table_name in pk_map:
                    pk_columns = set(pk_map[table_name])
                    logger.info(f"Using model-defined primary key: {', '.join(pk_columns)}")
            
            # 2. Recreate Local Table - FORCE ALL NUMERIC TO FLOAT for SE2010
            local_metadata = MetaData()
            safe_columns = []
            numeric_columns = {}  # Track which columns need type conversion
            
            for col in columns:
                col_name = col['name']
                col_type = col['type']
                is_primary = col_name in pk_columns
                
                # AGGRESSIVE FIX: For SE2010, convert ALL numeric types to Float
                needs_float_conversion = False
                type_str = str(col_type).upper()
                type_class_str = str(type(col_type)).upper()
                
                # Check if it's any kind of numeric type
                is_numeric = (
                    isinstance(col_type, Numeric) or
                    'NUMERIC' in type_str or 
                    'DECIMAL' in type_str or
                    'NUMERIC' in type_class_str or
                    'DECIMAL' in type_class_str
                )
                
                if is_numeric:
                    # For SE2010 table, convert ALL numeric to Float to avoid precision issues
                    if table_name in ["SE1010", "SE2010"]:
                        needs_float_conversion = True
                        col_type = Float()
                    else:
                        # For other tables, check precision
                        if isinstance(col_type, Numeric):
                            try:
                                precision = getattr(col_type, 'precision', None)
                                scale = getattr(col_type, 'scale', None)
                                if precision == 0 or precision is None or scale is None:
                                    needs_float_conversion = True
                                    col_type = Float()
                            except:
                                needs_float_conversion = True
                                col_type = Float()
                        else:
                            # If we can't determine, convert to Float to be safe
                            needs_float_conversion = True
                            col_type = Float()
                
                numeric_columns[col_name] = needs_float_conversion
                safe_columns.append(Column(col_name, col_type, primary_key=is_primary, autoincrement=False, nullable=True))

            local_table = Table(table_name, local_metadata, *safe_columns)
            
            # Drop and Create
            local_metadata.drop_all(engine_local)
            local_metadata.create_all(engine_local)
            
            # 3. Stream Data with Bulk Insert for Performance
            col_names = [c.name for c in local_table.columns]
            cols_str = ", ".join([f"[{c}]" for c in col_names])
            
            # Use bulk insert for better performance
            # Smaller chunk size for large tables to avoid memory issues
            chunk_size = 5000 if len(col_names) > 50 else 20000
            total_rows = 0
            
            with engine_remote.connect() as remote_conn:
                result_proxy = remote_conn.execution_options(stream_results=True).execute(text(f"SELECT * FROM {table_name}"))
                
                with engine_local.begin() as local_conn:
                    batch = []
                    while True:
                        rows = result_proxy.fetchmany(chunk_size)
                        if not rows:
                            # Insert remaining batch
                            if batch:
                                try:
                                    use_raw_sql = table_name in ["SE1010", "SE2010", "CTT010", "PAD010", "SC6010"] or any(numeric_columns.values())
                                    
                                    if use_raw_sql:
                                        # Use raw SQL for remaining batch
                                        placeholders = ", ".join(["?" for _ in col_names])
                                        insert_sql = f"INSERT INTO [{table_name}] ({cols_str}) VALUES ({placeholders})"
                                        converted_batch = []
                                        for row_dict in batch:
                                            converted_row = []
                                            for col_name in col_names:
                                                val = row_dict.get(col_name)
                                                if numeric_columns.get(col_name, False) and val is not None:
                                                    try:
                                                        converted_row.append(float(val))
                                                    except (ValueError, TypeError, OverflowError):
                                                        converted_row.append(None)
                                                else:
                                                    converted_row.append(val)
                                            converted_batch.append(tuple(converted_row))
                                        raw_conn = local_conn.connection.dbapi_connection
                                        cursor = raw_conn.cursor()
                                        cursor.executemany(insert_sql, converted_batch)
                                        raw_conn.commit()
                                        cursor.close()
                                    else:
                                        local_conn.execute(
                                            local_table.insert(),
                                            batch
                                        )
                                    total_rows += len(batch)
                                    logger.info(f"Synced {total_rows} rows for {table_name}...")
                                except Exception as batch_error:
                                    logger.warning(f"Error inserting batch in {table_name}: {batch_error}")
                            break
                        
                        # Convert rows to dicts for bulk insert
                        for row in rows:
                            try:
                                row_dict = {}
                                for i, col_name in enumerate(col_names):
                                    value = row[i] if i < len(row) else None
                                    
                                    # Handle None values and convert problematic numeric types
                                    if value is None:
                                        row_dict[col_name] = None
                                    elif numeric_columns.get(col_name, False):
                                        # Convert to float for numeric columns with precision issues
                                        try:
                                            row_dict[col_name] = float(value) if value is not None else None
                                        except (ValueError, TypeError):
                                            row_dict[col_name] = None
                                    else:
                                        row_dict[col_name] = value
                                
                                batch.append(row_dict)
                                
                                # Insert in batches for better performance
                                if len(batch) >= 50:  # Small batches to avoid parameter issues
                                    try:
                                        # Use raw SQL with executemany for tables with numeric precision issues
                                        # This gives us full control over type conversion
                                        use_raw_sql = table_name in ["SE1010", "SE2010", "CTT010", "PAD010", "SC6010"] or any(numeric_columns.values())
                                        
                                        if use_raw_sql:
                                            # Build INSERT statement
                                            placeholders = ", ".join(["?" for _ in col_names])
                                            insert_sql = f"INSERT INTO [{table_name}] ({cols_str}) VALUES ({placeholders})"
                                            
                                            # Convert batch to tuples with proper type conversion
                                            converted_batch = []
                                            for row_dict in batch:
                                                converted_row = []
                                                for col_name in col_names:
                                                    val = row_dict.get(col_name)
                                                    if numeric_columns.get(col_name, False) and val is not None:
                                                        try:
                                                            converted_row.append(float(val))
                                                        except (ValueError, TypeError, OverflowError):
                                                            converted_row.append(None)
                                                    else:
                                                        converted_row.append(val)
                                                converted_batch.append(tuple(converted_row))
                                            
                                            # Use raw connection for executemany
                                            raw_conn = local_conn.connection.dbapi_connection
                                            cursor = raw_conn.cursor()
                                            cursor.executemany(insert_sql, converted_batch)
                                            raw_conn.commit()
                                            cursor.close()
                                        else:
                                            local_conn.execute(
                                                local_table.insert(),
                                                batch
                                            )
                                        total_rows += len(batch)
                                        if total_rows % 10000 == 0:
                                            logger.info(f"Synced {total_rows} rows for {table_name}...")
                                        batch = []
                                    except Exception as batch_error:
                                        logger.warning(f"Error inserting batch in {table_name}: {batch_error}")
                                        # Try inserting one by one if batch fails
                                        for single_row in batch:
                                            try:
                                                use_raw_sql = table_name in ["SE1010", "SE2010", "CTT010", "PAD010", "SC6010"] or any(numeric_columns.values())
                                                
                                                if use_raw_sql:
                                                    # Use raw SQL for single row too
                                                    placeholders = ", ".join(["?" for _ in col_names])
                                                    insert_sql = f"INSERT INTO [{table_name}] ({cols_str}) VALUES ({placeholders})"
                                                    converted_row = []
                                                    for col_name in col_names:
                                                        val = single_row.get(col_name)
                                                        if numeric_columns.get(col_name, False) and val is not None:
                                                            try:
                                                                converted_row.append(float(val))
                                                            except (ValueError, TypeError, OverflowError):
                                                                converted_row.append(None)
                                                        else:
                                                            converted_row.append(val)
                                                    raw_conn = local_conn.connection.dbapi_connection
                                                    cursor = raw_conn.cursor()
                                                    cursor.execute(insert_sql, tuple(converted_row))
                                                    raw_conn.commit()
                                                    cursor.close()
                                                else:
                                                    local_conn.execute(
                                                        local_table.insert(),
                                                        [single_row]
                                                    )
                                                total_rows += 1
                                            except Exception as single_error:
                                                logger.warning(f"Error inserting single row in {table_name}: {single_error}")
                                                continue
                                        batch = []
                            except Exception as row_error:
                                logger.warning(f"Error processing row in {table_name}: {row_error}")
                                continue
            
            logger.info(f"Finished syncing {table_name}. Total: {total_rows}")
            return True

        except Exception as e:
            import traceback
            logger.error(f"Error syncing {table_name}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False

sync_service = SyncService()
