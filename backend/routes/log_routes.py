# log_routes.py
# Endpoints for submitting daily logs and retrieving scores.

import sys
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from backend import database, auth
from ml_model.scorer import FocusAIScorer

router = APIRouter(prefix="/logs", tags=["Logs & Scores"])

# Load ML scorer once when server starts
scorer = FocusAIScorer()

# HTTPBearer tells FastAPI to expect "Bearer <token>" in the
# Authorization header. This also makes Swagger UI handle it correctly.
security = HTTPBearer()


# -------------------------------------------------------
# HELPER: Verify token and return current user
# -------------------------------------------------------

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI automatically extracts the Bearer token from the
    Authorization header and passes it here via Depends().
    
    Depends() is FastAPI's dependency injection system —
    it runs this function before the endpoint function,
    and passes the result in as a parameter.
    """
    token = credentials.credentials  # Just the token, no "Bearer " prefix

    payload = auth.decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired. Please log in again."
        )

    user = database.get_user_by_id(str(payload["user_id"]))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return user


# -------------------------------------------------------
# REQUEST MODEL
# -------------------------------------------------------

class DailyLogRequest(BaseModel):
    screen_time_hours:     float
    social_media_hours:    float
    gaming_hours:          float
    study_hours:           float
    sleep_hours:           float
    mood_score:            int
    productivity_score:    int
    notifications_checked: int
    outside_time_minutes:  int


# -------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------

@router.post("/submit")
def submit_log(
    request: DailyLogRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts daily behavior data, runs ML model, saves and returns scores.
    This is the core endpoint of FocusAI.
    """

    # Build log dict for scorer
    log_data = {
        'screen_time_hours':     request.screen_time_hours,
        'social_media_hours':    request.social_media_hours,
        'gaming_hours':          request.gaming_hours,
        'study_hours':           request.study_hours,
        'sleep_hours':           request.sleep_hours,
        'mood_score':            request.mood_score,
        'productivity_score':    request.productivity_score,
        'notifications_checked': request.notifications_checked,
        'outside_time_minutes':  request.outside_time_minutes
    }

    # Run through ML model
    result = scorer.score_user(log_data)

    # Build full record to save
    record = {
        **log_data,
        'user_id':               current_user['user_id'],
        'addiction_risk_score':  result['scores']['addiction_risk_score'],
        'focus_score':           result['scores']['focus_score'],
        'productivity_score_ai': result['scores']['productivity_score']
    }

    database.save_log(record)

    return {
        "message":         "Log submitted successfully.",
        "user":            current_user['name'],
        "scores":          result['scores'],
        "risk_category":   result['risk_category'],
        "recommendations": result['recommendations']
    }


@router.get("/scores/{user_id}")
def get_scores(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Returns the most recent scores for a user."""

    if str(current_user['user_id']) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own scores."
        )

    scores = database.get_latest_scores(user_id)

    if not scores:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No logs found. Submit a daily log first."
        )

    return scores


@router.get("/history/{user_id}")
def get_history(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Returns the last 30 daily logs for a user."""

    if str(current_user['user_id']) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own history."
        )

    logs = database.get_logs_for_user(user_id, limit=30)

    return {
        "user_id":   user_id,
        "log_count": len(logs),
        "logs":      logs
    }