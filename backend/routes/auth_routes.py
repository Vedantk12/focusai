# auth_routes.py

import sys
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Import directly — no "backend." prefix because uvicorn runs from inside backend/
import database as db_module
import auth

router   = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


class RegisterRequest(BaseModel):
    name:       str
    email:      str
    password:   str
    age:        int
    occupation: str

class LoginRequest(BaseModel):
    email:    str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    user_id:      str
    name:         str


@router.post("/register", status_code=201)
def register(request: RegisterRequest, db: Session = Depends(db_module.get_db)):
    if db_module.email_exists(db, request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    hashed_pw = auth.hash_password(request.password)
    user = db_module.create_user(
        db,
        name            = request.name,
        email           = request.email,
        hashed_password = hashed_pw,
        age             = request.age,
        occupation      = request.occupation
    )
    return {
        "message": "Account created successfully.",
        "user_id": user.user_id,
        "name":    user.name
    }


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(db_module.get_db)):
    user = db_module.get_user_by_email(db, request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not auth.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    token = auth.create_access_token(data={"user_id": user.user_id})
    return TokenResponse(
        access_token = token,
        token_type   = "bearer",
        user_id      = user.user_id,
        name         = user.name
    )