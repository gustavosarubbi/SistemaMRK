from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError

from app.core.config import settings
from app.core import security
from app.schemas.token import TokenPayload
from app.db.session import SessionLocal, SessionRemote

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_db() -> Generator:
    """Retorna sessão do banco LOCAL (para PAD010 e dados sincronizados)"""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_db_remote() -> Generator:
    """Retorna sessão do banco REMOTO"""
    try:
        db = SessionRemote()
        yield db
    finally:
        db.close()

def get_current_user(
    token: str = Depends(reusable_oauth2)
) -> str:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    if not token_data.sub:
        raise HTTPException(status_code=404, detail="User not found")
        
    # For simple auth, we just return the username (sub)
    # In a real DB auth, we would fetch the user object here
    return token_data.sub

