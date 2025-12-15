import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class Settings:
    PROJECT_NAME: str = "SistemaMRK"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Auth
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    
    # Database Remote (Origem)
    DB_SERVER = os.getenv("DB_SERVER")
    DB_PORT = os.getenv("DB_PORT", "1433")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_NAME = os.getenv("DB_NAME")
    DB_ENCRYPT = os.getenv("DB_ENCRYPT", "false").lower() == "true"
    DB_TRUST_SERVER_CERTIFICATE = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "true").lower() == "true"
    
    # Database Local (Destino)
    LOCAL_DB_SERVER = os.getenv("LOCAL_DB_SERVER", "localhost")
    LOCAL_DB_PORT = os.getenv("LOCAL_DB_PORT", "1433")
    LOCAL_DB_USER = os.getenv("LOCAL_DB_USER")
    LOCAL_DB_PASSWORD = os.getenv("LOCAL_DB_PASSWORD")
    LOCAL_DB_NAME = os.getenv("LOCAL_DB_NAME")
    LOCAL_DB_ENCRYPT = os.getenv("LOCAL_DB_ENCRYPT", "false").lower() == "true"
    LOCAL_DB_TRUST_SERVER_CERTIFICATE = os.getenv("LOCAL_DB_TRUST_SERVER_CERTIFICATE", "true").lower() == "true"
    
    # Database Local Validated (Dados Validados)
    LOCAL_DB_NAME_VALIDATED = os.getenv("LOCAL_DB_NAME_VALIDATED", "SistemaMRK_Validated")
    
    # Admin Simple Auth
    ADMIN_USER = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASS = os.getenv("ADMIN_PASS", "admin")

    @property
    def SQLALCHEMY_DATABASE_URI_REMOTE(self) -> str:
        if not self.DB_SERVER:
            return "sqlite:///./remote_mock.db" # Fallback or mock
        
        # Validate required credentials - but allow None for optional development
        if not self.DB_USER or not self.DB_PASSWORD:
            logger.warning(
                "DB_USER and/or DB_PASSWORD are not set. "
                "Remote database connections will fail. Please set these in your .env file."
            )
            # Return a connection string that will fail gracefully
            driver = "ODBC Driver 17 for SQL Server"
            params = f"DRIVER={{{driver}}};SERVER={self.DB_SERVER},{self.DB_PORT};DATABASE={self.DB_NAME};UID=None;PWD=None"
            return f"mssql+pyodbc:///?odbc_connect={params}"
        
        driver = "ODBC Driver 17 for SQL Server"
        params = f"DRIVER={{{driver}}};SERVER={self.DB_SERVER},{self.DB_PORT};DATABASE={self.DB_NAME};UID={self.DB_USER};PWD={self.DB_PASSWORD}"
        
        if self.DB_ENCRYPT:
            params += ";Encrypt=yes"
        else:
            params += ";Encrypt=no"
            
        if self.DB_TRUST_SERVER_CERTIFICATE:
            params += ";TrustServerCertificate=yes"
            
        return f"mssql+pyodbc:///?odbc_connect={params}"

    @property
    def SQLALCHEMY_DATABASE_URI_LOCAL(self) -> str:
        if not self.LOCAL_DB_SERVER:
            return "sqlite:///./local.db"
        
        # Validate required credentials - but allow None for optional development
        # The actual connection will fail gracefully if credentials are missing
        if not self.LOCAL_DB_USER or not self.LOCAL_DB_PASSWORD:
            # Return a connection string that will fail with a clear error message
            # This allows the server to start but will fail when trying to connect
            logger.warning(
                "LOCAL_DB_USER and/or LOCAL_DB_PASSWORD are not set. "
                "Database connections will fail. Please set these in your .env file."
            )
            # Return a connection string that will fail gracefully
            driver = "ODBC Driver 17 for SQL Server"
            params = f"DRIVER={{{driver}}};SERVER={self.LOCAL_DB_SERVER},{self.LOCAL_DB_PORT};DATABASE={self.LOCAL_DB_NAME};UID=None;PWD=None"
            return f"mssql+pyodbc:///?odbc_connect={params}"
            
        driver = "ODBC Driver 17 for SQL Server"
        params = f"DRIVER={{{driver}}};SERVER={self.LOCAL_DB_SERVER},{self.LOCAL_DB_PORT};DATABASE={self.LOCAL_DB_NAME};UID={self.LOCAL_DB_USER};PWD={self.LOCAL_DB_PASSWORD}"
        
        if self.LOCAL_DB_ENCRYPT:
            params += ";Encrypt=yes"
        else:
            params += ";Encrypt=no"
            
        if self.LOCAL_DB_TRUST_SERVER_CERTIFICATE:
            params += ";TrustServerCertificate=yes"
            
        return f"mssql+pyodbc:///?odbc_connect={params}"

    @property
    def SQLALCHEMY_DATABASE_URI_LOCAL_VALIDATED(self) -> str:
        if not self.LOCAL_DB_SERVER:
            return "sqlite:///./validated.db"
        
        # Validate required credentials - but allow None for optional development
        if not self.LOCAL_DB_USER or not self.LOCAL_DB_PASSWORD:
            logger.warning(
                "LOCAL_DB_USER and/or LOCAL_DB_PASSWORD are not set. "
                "Validated database connections will fail. Please set these in your .env file."
            )
            # Return a connection string that will fail gracefully
            driver = "ODBC Driver 17 for SQL Server"
            params = f"DRIVER={{{driver}}};SERVER={self.LOCAL_DB_SERVER},{self.LOCAL_DB_PORT};DATABASE={self.LOCAL_DB_NAME_VALIDATED};UID=None;PWD=None"
            return f"mssql+pyodbc:///?odbc_connect={params}"
            
        driver = "ODBC Driver 17 for SQL Server"
        params = f"DRIVER={{{driver}}};SERVER={self.LOCAL_DB_SERVER},{self.LOCAL_DB_PORT};DATABASE={self.LOCAL_DB_NAME_VALIDATED};UID={self.LOCAL_DB_USER};PWD={self.LOCAL_DB_PASSWORD}"
        
        if self.LOCAL_DB_ENCRYPT:
            params += ";Encrypt=yes"
        else:
            params += ";Encrypt=no"
            
        if self.LOCAL_DB_TRUST_SERVER_CERTIFICATE:
            params += ";TrustServerCertificate=yes"
            
        return f"mssql+pyodbc:///?odbc_connect={params}"

settings = Settings()

