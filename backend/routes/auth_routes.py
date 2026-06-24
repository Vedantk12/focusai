# auth_routes.py
# Defines /auth/register and /auth/login endpoints.

import sys
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend import database, auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


# -------------------------------------------------------
# REQUEST / RESPONSE MODELS
# -------------------------------------------------------

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


# -------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------

@router.post("/register", status_code=201)
def register(request: RegisterRequest):
    """
    Creates a new user account.
    Steps:
    1. Check email is not already taken
    2. Hash the password
    3. Save user to database
    4. Return success message
    """

    # Step 1: Check for duplicate email
    if database.email_exists(request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Step 2: Hash the password — NEVER save plain text
    hashed_pw = auth.hash_password(request.password)

    # Step 3: Save to database
    user = database.create_user(
        name            = request.name,
        email           = request.email,
        hashed_password = hashed_pw,
        age             = request.age,
        occupation      = request.occupation
    )

    # Step 4: Return success
    return {
        "message": "Account created successfully.",
        "user_id": user["user_id"],
        "name":    user["name"]
    }


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """
    Authenticates a user and returns a JWT token.
    Steps:
    1. Find user by email
    2. Verify their password
    3. Create a JWT token
    4. Return the token
    """

    # Step 1: Look up user
    user = database.get_user_by_email(request.email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Step 2: Verify password
    if not auth.verify_password(request.password, str(user["hashed_password"])):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Step 3: Create JWT token
    token = auth.create_access_token(data={"user_id": user["user_id"]})

    # Step 4: Return token
    return TokenResponse(
        access_token = token,
        token_type   = "bearer",
        user_id      = str(user["user_id"]),
        name         = str(user["name"])
    )