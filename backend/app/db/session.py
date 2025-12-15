from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Remote Database (Source - Read Only intent)
# Allow engine creation even if credentials are missing - will fail on actual connection
engine_remote = create_engine(
    settings.SQLALCHEMY_DATABASE_URI_REMOTE, 
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)
SessionRemote = sessionmaker(autocommit=False, autoflush=False, bind=engine_remote)

# Local Database (Destination - Read/Write)
# fast_executemany=True is crucial for performance with large bulk inserts in SQL Server
# Allow engine creation even if credentials are missing - will fail on actual connection
engine_local = create_engine(
    settings.SQLALCHEMY_DATABASE_URI_LOCAL, 
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    use_insertmanyvalues=False 
)

# Enable fast_executemany for pyodbc
from sqlalchemy import event
@event.listens_for(engine_local, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, params, context, executemany):
    if executemany:
        cursor.fast_executemany = True

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_local)

# Validated Database (Dados Validados - Read/Write)
# Allow engine creation even if credentials are missing - will fail on actual connection
engine_validated = create_engine(
    settings.SQLALCHEMY_DATABASE_URI_LOCAL_VALIDATED, 
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    use_insertmanyvalues=False 
)

# Enable fast_executemany for pyodbc
@event.listens_for(engine_validated, "before_cursor_execute")
def receive_before_cursor_execute_validated(conn, cursor, statement, params, context, executemany):
    if executemany:
        cursor.fast_executemany = True

SessionValidated = sessionmaker(autocommit=False, autoflush=False, bind=engine_validated)

def get_db_local():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_remote():
    db = SessionRemote()
    try:
        yield db
    finally:
        db.close()

def get_db_validated():
    db = SessionValidated()
    try:
        yield db
    finally:
        db.close()

