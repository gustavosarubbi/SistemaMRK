from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Remote Database (Source - Read Only intent)
engine_remote = create_engine(
    settings.SQLALCHEMY_DATABASE_URI_REMOTE, 
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)
SessionRemote = sessionmaker(autocommit=False, autoflush=False, bind=engine_remote)

# Local Database (Destination - Read/Write)
# fast_executemany=True is crucial for performance with large bulk inserts in SQL Server
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

