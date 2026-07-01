from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import datetime
import uuid
from jose import JWTError

from backend.api.deps import get_db, get_current_user
from backend.repositories.user_repository import user_repository
from backend.core.security import (
    verify_password, create_access_token, create_refresh_token, decode_token
)
from backend.models.db_models import User
from pydantic import BaseModel, Field, ConfigDict

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegisterSchema(BaseModel):
    email: str = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")
    role: str = Field(default="Viewer", description="Access role (Admin, Manager, Analyst, Viewer)")

class UserLoginSchema(BaseModel):
    email: str
    password: str

class TokenResponseSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str

class RefreshRequestSchema(BaseModel):
    refresh_token: str

class UserProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: str
    is_active: bool

@router.post("/register", response_model=UserProfileSchema, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterSchema, db: Session = Depends(get_db)):
    """
    Register a new user inside InsightForge.
    Enforces email uniqueness. Roles allowed: Admin, Manager, Analyst, Viewer.
    """
    normalized_email = payload.email.strip().lower()
    existing_user = user_repository.get_by_email(db, normalized_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    # Restrict roles to standard RBAC list
    role = payload.role
    if role not in ["Admin", "Manager", "Analyst", "Viewer"]:
        role = "Viewer"

    user = user_repository.create_user(db, email=normalized_email, password=payload.password, role=role)
    user_repository.log_audit_action(db, user_id=user.id, action="user_registered")
    return user

@router.post("/login", response_model=TokenResponseSchema)
def login_user(payload: UserLoginSchema, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user credentials.
    Generates access (30 mins) and refresh (7 days) tokens.
    """
    normalized_email = payload.email.strip().lower()
    user = user_repository.get_by_email(db, normalized_email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    # Generate tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    # Store refresh token active session
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    user_repository.create_user_session(db, user_id=user.id, refresh_token=refresh_token, expires_at=expires_at)
    
    # Log audit trail
    ip_addr = request.client.host if request.client else None
    user_repository.log_audit_action(db, user_id=user.id, action="user_logged_in", ip_address=ip_addr)

    return TokenResponseSchema(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role
    )

@router.post("/refresh", response_model=TokenResponseSchema)
def refresh_access_token(payload: RefreshRequestSchema, db: Session = Depends(get_db)):
    """
    Refresh access token using a valid refresh token.
    Prevents reuse of revoked refresh tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh credentials."
    )
    
    try:
        token_payload = decode_token(payload.refresh_token)
        user_id_str: str = token_payload.get("sub")
        token_type: str = token_payload.get("type")
        if user_id_str is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Check refresh token register in database
    active_session = user_repository.get_active_session(db, payload.refresh_token)
    if not active_session:
        raise credentials_exception
        
    if active_session.expires_at < datetime.datetime.utcnow():
        user_repository.revoke_user_session(db, payload.refresh_token)
        raise credentials_exception

    user = user_repository.get(db, active_session.user_id)
    if not user or not user.is_active:
        raise credentials_exception

    # Generate new tokens
    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    
    # Revoke old session, save new session
    user_repository.revoke_user_session(db, payload.refresh_token)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    user_repository.create_user_session(db, user_id=user.id, refresh_token=new_refresh_token, expires_at=expires_at)

    return TokenResponseSchema(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        role=user.role
    )

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout_user(payload: RefreshRequestSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Revokes the current active session associated with the refresh token.
    """
    user_repository.revoke_user_session(db, payload.refresh_token)
    user_repository.log_audit_action(db, user_id=current_user.id, action="user_logged_out")
    return {"message": "Successfully logged out and session revoked."}

@router.get("/me", response_model=UserProfileSchema)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's profile metadata.
    """
    return UserProfileSchema(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active
    )
