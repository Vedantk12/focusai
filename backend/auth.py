# auth.py
# Handles password hashing and JWT token creation/verification.

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

# -------------------------------------------------------
# PASSWORD HASHING
# -------------------------------------------------------

# Using sha256_crypt instead of bcrypt to avoid version conflicts
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Converts a plain password to a secure hash.
    sha256_crypt is secure and has no 72-byte limit like bcrypt.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if a plain password matches its stored hash.
    Used during login.
    """
    return pwd_context.verify(plain_password, hashed_password)


# -------------------------------------------------------
# JWT TOKENS
# -------------------------------------------------------

SECRET_KEY = "focusai-secret-key-change-this-in-production-2026"
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def create_access_token(data: dict,
                        expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT token containing user data.
    Token expires after 24 hours by default.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decodes and verifies a JWT token.
    Returns the payload dict if valid, None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None