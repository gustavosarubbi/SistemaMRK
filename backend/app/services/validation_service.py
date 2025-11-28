import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import text, inspect, Table, MetaData, Column, String, Integer, DateTime, Float, Date
from app.db.session import engine_local, engine_validated, SessionLocal, SessionValidated
from app.models.validation import ValidationStatus, Base

logger = logging.getLogger(__name__)

class ValidationService:
    def __init__(self):
        self.tables = ["CTT010", "PAC010", "PAD010"]
        self._ensure_validation_table()
    
    def _ensure_validation_table(self):
        """Create validation status table if not exists."""
        try:
            Base.metadata.create_all(engine_local)
        except Exception as e:
            logger.warning(f"Could not ensure validation table: {e}")
    
    def _ensure_validated_table(self, table_name: str):
        """Create table in validated database if not exists."""
        try:
            inspector = inspect(engine_local)
            columns = inspector.get_columns(table_name)
            
            if not columns:
                logger.warning(f"Table {table_name} not found in local database.")
                return False
            
            # Check if table exists in validated database
            validated_inspector = inspect(engine_validated)
            if validated_inspector.has_table(table_name):
                return True
            
            # Create table in validated database
            validated_metadata = MetaData()
            safe_columns = []
            for col in columns:
                col_name = col['name']
                col_type = col['type']
                # Preserve primary key
                is_primary = col.get('primary_key', False)
                safe_columns.append(Column(col_name, col_type, primary_key=is_primary, autoincrement=False))
            
            validated_table = Table(table_name, validated_metadata, *safe_columns)
            validated_metadata.create_all(engine_validated)
            
            logger.info(f"Created table {table_name} in validated database.")
            return True
        except Exception as e:
            logger.error(f"Error ensuring validated table {table_name}: {e}")
            return False
    
    def get_validation_status(self, table_name: str, record_id: str) -> Optional[Dict[str, Any]]:
        """Get validation status for a record."""
        try:
            with SessionLocal() as db:
                status = db.query(ValidationStatus).filter(
                    ValidationStatus.table_name == table_name,
                    ValidationStatus.record_id == str(record_id)
                ).first()
                
                if not status:
                    return {
                        "status": "PENDING",
                        "validated_at": None,
                        "validated_by": None,
                        "rejection_reason": None
                    }
                
                return {
                    "status": status.status,
                    "validated_at": status.validated_at.isoformat() if status.validated_at else None,
                    "validated_by": status.validated_by,
                    "rejection_reason": status.rejection_reason
                }
        except Exception as e:
            logger.error(f"Error getting validation status: {e}")
            return None
    
    def update_validation_status(
        self, 
        table_name: str, 
        record_id: str, 
        status: str, 
        validated_by: str,
        rejection_reason: Optional[str] = None
    ) -> bool:
        """Update validation status for a record."""
        try:
            with SessionLocal() as db:
                existing = db.query(ValidationStatus).filter(
                    ValidationStatus.table_name == table_name,
                    ValidationStatus.record_id == str(record_id)
                ).first()
                
                if existing:
                    existing.status = status
                    existing.validated_at = datetime.now() if status != "PENDING" else None
                    existing.validated_by = validated_by if status != "PENDING" else None
                    existing.rejection_reason = rejection_reason
                    existing.updated_at = datetime.now()
                else:
                    new_status = ValidationStatus(
                        table_name=table_name,
                        record_id=str(record_id),
                        status=status,
                        validated_at=datetime.now() if status != "PENDING" else None,
                        validated_by=validated_by if status != "PENDING" else None,
                        rejection_reason=rejection_reason
                    )
                    db.add(new_status)
                
                db.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating validation status: {e}")
            return False
    
    def migrate_to_validated(self, table_name: str, record_data: Dict[str, Any]) -> bool:
        """Migrate a record to the validated database."""
        try:
            # Ensure table exists in validated database
            if not self._ensure_validated_table(table_name):
                return False
            
            # Get column names from local table
            inspector = inspect(engine_local)
            columns = inspector.get_columns(table_name)
            col_names = [col['name'] for col in columns]
            
            # Prepare data for insertion
            insert_data = {}
            for col_name in col_names:
                if col_name in record_data:
                    insert_data[col_name] = record_data[col_name]
            
            # Build insert statement
            cols_str = ", ".join([f"[{c}]" for c in col_names if c in insert_data])
            placeholders = ", ".join([f":{c}" for c in col_names if c in insert_data])
            insert_sql = f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})"
            
            # Insert into validated database
            with engine_validated.begin() as conn:
                conn.execute(text(insert_sql), insert_data)
            
            logger.info(f"Migrated record {record_data.get('CTT_CUSTO') or record_data.get('R_E_C_N_O_')} from {table_name} to validated database.")
            return True
        except Exception as e:
            logger.error(f"Error migrating record to validated database: {e}")
            return False
    
    def update_record(self, table_name: str, record_id: str, updates: Dict[str, Any]) -> bool:
        """Update a record in the local database."""
        try:
            # Determine primary key column
            inspector = inspect(engine_local)
            pk_columns = inspector.get_pk_constraint(table_name)
            pk_column = pk_columns['constrained_columns'][0] if pk_columns['constrained_columns'] else None
            
            if not pk_column:
                logger.error(f"No primary key found for table {table_name}")
                return False
            
            # Build update statement
            set_clauses = ", ".join([f"[{k}] = :{k}" for k in updates.keys()])
            update_sql = f"UPDATE {table_name} SET {set_clauses} WHERE [{pk_column}] = :record_id"
            
            update_params = updates.copy()
            update_params['record_id'] = record_id
            
            with engine_local.begin() as conn:
                result = conn.execute(text(update_sql), update_params)
                if result.rowcount == 0:
                    logger.warning(f"Record {record_id} not found in {table_name}")
                    return False
            
            logger.info(f"Updated record {record_id} in {table_name}")
            return True
        except Exception as e:
            logger.error(f"Error updating record: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get validation statistics."""
        try:
            with SessionLocal() as db:
                stats = {}
                for table_name in self.tables:
                    total = db.query(ValidationStatus).filter(
                        ValidationStatus.table_name == table_name
                    ).count()
                    
                    pending = db.query(ValidationStatus).filter(
                        ValidationStatus.table_name == table_name,
                        ValidationStatus.status == "PENDING"
                    ).count()
                    
                    approved = db.query(ValidationStatus).filter(
                        ValidationStatus.table_name == table_name,
                        ValidationStatus.status == "APPROVED"
                    ).count()
                    
                    rejected = db.query(ValidationStatus).filter(
                        ValidationStatus.table_name == table_name,
                        ValidationStatus.status == "REJECTED"
                    ).count()
                    
                    stats[table_name] = {
                        "total": total,
                        "pending": pending,
                        "approved": approved,
                        "rejected": rejected
                    }
                
                return stats
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}

validation_service = ValidationService()

