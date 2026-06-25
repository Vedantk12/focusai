# log_routes.py

import sys
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Direct imports — no "backend." prefix
import database as db_module
from database import get_db
import auth
from database import get_db
from ml_model.scorer import FocusAIScorer

router   = APIRouter(prefix="/logs", tags=["Logs & Scores"])
security = HTTPBearer()
scorer   = FocusAIScorer()


# -------------------------------------------------------
# DATE VALIDATION
# -------------------------------------------------------

def validate_log_date(log_date_str: Optional[str]) -> date:
    """
    Allows logging for any day within the last 7 days.
    This supports the calendar — users can fill in missed days.
    Future dates still blocked.
    """
    today = date.today()
    seven_days_ago = today - timedelta(days=7)

    if log_date_str is None:
        return today

    try:
        requested = date.fromisoformat(log_date_str)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    if requested > today:
        raise HTTPException(
            status_code=400,
            detail="Cannot log for a future date."
        )
    elif requested < seven_days_ago:
        raise HTTPException(
            status_code=400,
            detail=f"Can only log within the last 7 days. {requested} is too old."
        )

    return requested


# -------------------------------------------------------
# AUTH DEPENDENCY
# -------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(db_module.get_db)
):
    token   = credentials.credentials
    payload = auth.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired. Please log in again."
        )
    user = db_module.get_user_by_id(db, str(payload["user_id"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


# -------------------------------------------------------
# REQUEST MODEL
# -------------------------------------------------------

class DailyLogRequest(BaseModel):
    log_date:              Optional[str] = None
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

@router.get("/check")
def check_log_exists(
    log_date:    Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session  = Depends(db_module.get_db)
):
    validated_date = validate_log_date(log_date)
    existing = db_module.get_log_by_user_and_date(db, current_user.user_id, validated_date)

    if existing:
        return {
            "exists":   True,
            "log_date": validated_date.isoformat(),
            "log":      db_module.log_to_dict(existing)
        }
    return {
        "exists":   False,
        "log_date": validated_date.isoformat(),
        "log":      None
    }


@router.post("/submit")
def submit_log(
    request:     DailyLogRequest,
    current_user = Depends(get_current_user),
    db: Session  = Depends(db_module.get_db)
):
    validated_date = validate_log_date(request.log_date)

    behavioral = {
        "screen_time_hours":     request.screen_time_hours,
        "social_media_hours":    request.social_media_hours,
        "gaming_hours":          request.gaming_hours,
        "study_hours":           request.study_hours,
        "sleep_hours":           request.sleep_hours,
        "mood_score":            request.mood_score,
        "productivity_score":    request.productivity_score,
        "notifications_checked": request.notifications_checked,
        "outside_time_minutes":  request.outside_time_minutes,
    }

    result = scorer.score_user(behavioral)

    log_data = {
        **behavioral,
        "addiction_risk_score":  result["scores"]["addiction_risk_score"],
        "focus_score":           result["scores"]["focus_score"],
        "productivity_score_ai": result["scores"]["productivity_score"],
        "risk_category":         result["risk_category"],
    }

    log, was_created = db_module.upsert_log(
        db,
        user_id  = current_user.user_id,
        log_date = validated_date,
        log_data = log_data
    )

    return {
        "message":         "Log created." if was_created else "Log updated.",
        "was_updated":     not was_created,
        "log":             db_module.log_to_dict(log),
        "scores":          result["scores"],
        "risk_category":   result["risk_category"],
        "recommendations": result["recommendations"]
    }


@router.get("/scores/{user_id}")
def get_scores(
    user_id:     str,
    current_user = Depends(get_current_user),
    db: Session  = Depends(db_module.get_db)
):
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    log = db_module.get_latest_log(db, user_id)
    if not log:
        raise HTTPException(status_code=404, detail="No logs found.")

    return {
        "addiction_risk_score":  log.addiction_risk_score,
        "focus_score":           log.focus_score,
        "productivity_score_ai": log.productivity_score_ai,
        "risk_category":         log.risk_category,
        "log_date":              log.log_date.isoformat()
    }


@router.get("/history/{user_id}")
def get_history(
    user_id:     str,
    current_user = Depends(get_current_user),
    db: Session  = Depends(db_module.get_db)
):
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    logs = db_module.get_logs_for_user(db, user_id, limit=30)
    return {
        "user_id":   user_id,
        "log_count": len(logs),
        "logs":      [db_module.log_to_dict(l) for l in logs]
    }


@router.get("/date/{log_date}")
def get_log_by_date(
    log_date:    str,
    current_user = Depends(get_current_user),
    db: Session  = Depends(db_module.get_db)
):
    try:
        requested_date = date.fromisoformat(log_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Use YYYY-MM-DD format.")

    log = db_module.get_log_by_user_and_date(db, current_user.user_id, requested_date)
    if not log:
        raise HTTPException(status_code=404, detail=f"No log for {log_date}.")

    return db_module.log_to_dict(log)

@router.get("/month/{year}/{month}")
def get_month_logs(
    year: int,
    month: int,
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db)
):
    """
    Returns all logs for a given month for the current user.
    Used by the calendar heatmap screen.
    """
    from sqlalchemy import extract
    logs = (
        db.query(DailyLogModel)
        .filter(
            DailyLogModel.user_id == current_user.user_id,
            extract('year',  DailyLogModel.log_date) == year,
            extract('month', DailyLogModel.log_date) == month
        )
        .all()
    )
    return {
        "year":  year,
        "month": month,
        "logs":  [log_to_dict(l) for l in logs]
    }
