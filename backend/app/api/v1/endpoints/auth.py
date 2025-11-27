from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core import security
from app.core.config import settings
from app.schemas.token import Token

from app.api import deps

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # Simple Auth Logic
    if form_data.username != settings.ADMIN_USER or form_data.password != settings.ADMIN_PASS:
        # In production with DB, verify_password would be used against a stored hash
        # if not security.verify_password(form_data.password, user.hashed_password): ...
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=form_data.username, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.get("/me")
def read_users_me(current_user: str = Depends(deps.get_current_user)) -> Any:
    """
    Get current user.
    """
    return {"username": current_user, "is_active": True, "is_superuser": True}

