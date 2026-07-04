import datetime
import uuid
from typing import Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from backend.core.config import settings

# Security Configuration Constants
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against its hashed signature.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Generates a secure bcrypt hash signature for a password.
    """
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: datetime.timedelta = None) -> str:
    """
    Generates a JWT Access Token.
    """
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "iat": datetime.datetime.utcnow(),
        "jti": str(uuid.uuid4()),
        "sub": str(subject),
        "type": "access"
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)

def create_refresh_token(subject: Union[str, Any], expires_delta: datetime.timedelta = None) -> str:
    """
    Generates a JWT Refresh Token.
    """
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode = {
        "exp": expire,
        "iat": datetime.datetime.utcnow(),
        "jti": str(uuid.uuid4()),
        "sub": str(subject),
        "type": "refresh"
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    """
    Decodes and validates a JWT token. Raises JWTError if invalid.
    """
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
