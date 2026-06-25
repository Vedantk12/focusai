# schemas.py
# Pydantic models define the shape of data coming IN (requests)
# and going OUT (responses) through the API.
#
# WHY SEPARATE SCHEMAS FROM DB MODELS:
# Your DB model (SQLAlchemy) defines how data is stored.
# Your schema (Pydantic) defines what the API accepts/returns.
# Keeping them separate means you can change one without breaking the other.
# For example: the DB stores hashed_password but the API never returns it.

from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional, List


# -------------------------------------------------------
# AUTH SCHEMAS
# -------------------------------------------------------

class RegisterRequest(BaseModel):
    name:       str
    email:      str
    password:   str
    age:        int
    occupation: str

    @field_validator('occupation')
    @classmethod
    def occupation_must_be_valid(cls, v):
        allowed = ['student', 'professional', 'other']
        if v not in allowed:
            raise ValueError(f"occupation must be one of {allowed}")
        return v

    @field_validator('age')
    @classmethod
    def age_must_be_reasonable(cls, v):
        if not (10 <= v <= 100):
            raise ValueError("age must be between 10 and 100")
        return v


class LoginRequest(BaseModel):
    email:    str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    user_id:      str
    name:         str


# -------------------------------------------------------
# LOG SCHEMAS
# -------------------------------------------------------

class DailyLogRequest(BaseModel):
    """
    What the mobile app sends when submitting or editing a log.
    log_date is optional — defaults to today on the server if not provided.
    """
    log_date:              Optional[str] = None   # Format: "YYYY-MM-DD"

    screen_time_hours:     float
    social_media_hours:    float
    gaming_hours:          float
    study_hours:           float
    sleep_hours:           float
    mood_score:            int
    productivity_score:    int
    notifications_checked: int
    outside_time_minutes:  int

    @field_validator('mood_score', 'productivity_score')
    @classmethod
    def score_must_be_1_to_10(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Score must be between 1 and 10")
        return v

    @field_validator('screen_time_hours', 'social_media_hours',
                     'gaming_hours', 'study_hours', 'sleep_hours')
    @classmethod
    def hours_must_be_positive(cls, v):
        if v < 0 or v > 24:
            raise ValueError("Hours must be between 0 and 24")
        return v


class LogCheckResponse(BaseModel):
    """
    Response when the app checks if a log exists for a date.
    The app uses this to decide whether to show Create or Edit mode.
    """
    exists:   bool
    log_date: str
    log:      Optional[dict] = None   # Full log data if exists=True


class LogResponse(BaseModel):
    """Response after submitting or editing a log."""
    message:         str
    was_updated:     bool             # True = edited existing, False = new
    log:             dict
    scores:          dict
    risk_category:   str
    recommendations: List[str]


class ScoresResponse(BaseModel):
    """Latest scores for a user."""
    addiction_risk_score:  float
    focus_score:           float
    productivity_score_ai: float
    risk_category:         str
    log_date:              str