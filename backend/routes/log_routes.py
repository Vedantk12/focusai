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
from database import get_db, DailyLogModel, log_to_dict
import auth
from database import get_db, DailyLogModel, log_to_dict
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




@router.get("/streak")
def get_streak(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db)
):
    """
    Calculates streak, badge type, and promotion status.
    Gold  = 2+ consecutive days ALL low risk (score < 25)
    Silver = 2+ consecutive days but inconsistent risk
    Silver -> Gold promotion = last 7 days all low risk
    """
    today = date.today()

    # Fetch last 30 days of logs sorted descending
    logs = (
        db.query(DailyLogModel)
        .filter(DailyLogModel.user_id == current_user.user_id)
        .order_by(DailyLogModel.log_date.desc())
        .limit(30)
        .all()
    )

    if not logs:
        return {
            "streak_days":   0,
            "badge":         None,
            "badge_label":   "No streak yet",
            "promotion_progress": 0,
            "promotion_target":   7,
            "message":       "Log 2 days in a row to earn your first badge!"
        }

    # Build a date->log map
    log_map = { l.log_date: l for l in logs }

    # Count consecutive days from today backwards
    streak = 0
    all_low_risk = True
    check_date = today

    while check_date in log_map:
        log = log_map[check_date]
        streak += 1
        risk = float(log.addiction_risk_score or 0)
        if risk >= 25:
            all_low_risk = False
        check_date -= timedelta(days=1)

    # No streak if less than 2 consecutive days
    if streak < 2:
        return {
            "streak_days":        streak,
            "badge":              None,
            "badge_label":        "Keep going!",
            "promotion_progress": streak,
            "promotion_target":   2,
            "message":            f"Log tomorrow to start your streak! ({streak}/2 days)"
        }

    # Determine badge
    if all_low_risk:
        badge = "gold"
        badge_label = "Gold Streak"
        message = f"Amazing! {streak} days of low risk. Keep it up! 🏆"
        return {
            "streak_days":        streak,
            "badge":              badge,
            "badge_label":        badge_label,
            "promotion_progress": 7,
            "promotion_target":   7,
            "message":            message
        }

    # Silver badge — check promotion progress (last 7 days all low risk?)
    promotion_progress = 0
    for i in range(7):
        d = today - timedelta(days=i)
        if d in log_map:
            risk = float(log_map[d].addiction_risk_score or 0)
            if risk < 25:
                promotion_progress += 1
            else:
                break
        else:
            break

    promoted = promotion_progress >= 7

    if promoted:
        badge = "gold"
        badge_label = "Gold Streak"
        message = f"Promoted to Gold! 7 days of low risk. Incredible! 🥇"
    else:
        badge = "silver"
        badge_label = "Silver Streak"
        message = f"{7 - promotion_progress} more low-risk days to reach Gold! 🥈"

    return {
        "streak_days":        streak,
        "badge":              badge,
        "badge_label":        badge_label,
        "promotion_progress": promotion_progress,
        "promotion_target":   7,
        "message":            message
    }

@router.get("/burnout")
def get_burnout_prediction(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db)
):
    today = date.today()
    logs = (
        db.query(DailyLogModel)
        .filter(DailyLogModel.user_id == current_user.user_id)
        .order_by(DailyLogModel.log_date.desc())
        .limit(7)
        .all()
    )
    if len(logs) < 3:
        return {"status": "insufficient_data", "level": "none", "title": "Not enough data", "message": "Log at least 3 days in a row to get burnout prediction.", "trend": [], "days_at_risk": 0, "advice": []}
    logs_sorted = sorted(logs, key=lambda l: l.log_date)
    risks = [float(l.addiction_risk_score or 0) for l in logs_sorted]
    dates = [l.log_date.strftime("%d/%m") for l in logs_sorted]
    last3 = risks[-3:]
    increasing = last3[0] < last3[1] < last3[2]
    decreasing = last3[0] > last3[1] > last3[2]
    high_risk_streak = 0
    for r in reversed(risks):
        if r >= 75:
            high_risk_streak += 1
        else:
            break
    moderate_streak = 0
    for r in reversed(risks):
        if r >= 50:
            moderate_streak += 1
        else:
            break
    trend_data = []
    for i, (d, r) in enumerate(zip(dates, risks)):
        direction = None
        if i > 0:
            diff = r - risks[i-1]
            direction = "up" if diff > 2 else ("down" if diff < -2 else "stable")
        trend_data.append({"date": d, "risk": round(r, 1), "direction": direction})
    if high_risk_streak >= 3:
        return {"status": "burnout_warning", "level": "critical", "title": "Burnout Warning!", "message": f"Your risk has been critically high for {high_risk_streak} days in a row. Immediate action needed.", "trend": trend_data, "days_at_risk": high_risk_streak, "advice": ["Take a complete digital detox day", "Sleep at least 8 hours tonight", "Spend 30+ minutes outside", "Limit social media to 30 min tomorrow", "Talk to someone you trust"]}
    if increasing and last3[2] >= 50:
        rise = round(last3[2] - last3[0], 1)
        return {"status": "risk_rising", "level": "warning", "title": "Risk Trending Up", "message": f"Your risk score has risen {rise} points over 3 days. Take action before it gets worse.", "trend": trend_data, "days_at_risk": 3, "advice": ["Reduce screen time by 1 hour tomorrow", "No phones 1 hour before bed", "Take a 15-min walk after meals", "Turn off non-essential notifications"]}
    if moderate_streak >= 3:
        return {"status": "sustained_moderate", "level": "caution", "title": "Sustained Moderate Risk", "message": f"{moderate_streak} days of moderate risk. Small changes now prevent burnout later.", "trend": trend_data, "days_at_risk": moderate_streak, "advice": ["Set a daily screen time limit", "Schedule one screen-free hour per day", "Prioritize 7-8 hours of sleep"]}
    if decreasing and last3[2] < last3[0]:
        drop = round(last3[0] - last3[2], 1)
        return {"status": "improving", "level": "good", "title": "You are Improving!", "message": f"Risk dropped {drop} points in 3 days. Keep up the great work!", "trend": trend_data, "days_at_risk": 0, "advice": ["Keep your current routine going", "Maintain your sleep schedule", "You are doing great, stay consistent!"]}
    return {"status": "stable", "level": "stable", "title": "Risk is Stable", "message": "No burnout risk detected. Keep logging daily to stay on track.", "trend": trend_data, "days_at_risk": 0, "advice": ["Keep logging daily", "Maintain your current habits"]}

@router.get("/burnout")
def get_burnout_prediction(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db)
):
    """
    Burnout prediction based on last 7 days trend.
    - BURNOUT WARNING  : risk increasing 3+ consecutive days
    - HIGH RISK ALERT  : risk >= 75 for 3+ consecutive days  
    - IMPROVING        : risk decreasing 3+ consecutive days
    - STABLE           : no clear trend
    """
    today = date.today()

    logs = (
        db.query(DailyLogModel)
        .filter(DailyLogModel.user_id == current_user.user_id)
        .order_by(DailyLogModel.log_date.desc())
        .limit(7)
        .all()
    )

    if len(logs) < 3:
        return {
            "status":      "insufficient_data",
            "level":       "none",
            "title":       "Not enough data",
            "message":     "Log at least 3 days in a row to get burnout prediction.",
            "trend":       [],
            "days_at_risk": 0,
            "advice":      []
        }

    # Sort oldest to newest
    logs_sorted = sorted(logs, key=lambda l: l.log_date)
    risks = [float(l.addiction_risk_score or 0) for l in logs_sorted]
    dates = [l.log_date.strftime('%d/%m') for l in logs_sorted]

    # Check consecutive increase (last 3 days)
    last3 = risks[-3:]
    increasing = last3[0] < last3[1] < last3[2]
    decreasing = last3[0] > last3[1] > last3[2]

    # Count consecutive high risk days from today backwards
    high_risk_streak = 0
    for r in reversed(risks):
        if r >= 75:
            high_risk_streak += 1
        else:
            break

    # Count consecutive moderate+ days
    moderate_streak = 0
    for r in reversed(risks):
        if r >= 50:
            moderate_streak += 1
        else:
            break

    # Calculate trend direction
    trend_data = []
    for i, (d, r) in enumerate(zip(dates, risks)):
        direction = None
        if i > 0:
            diff = r - risks[i-1]
            direction = 'up' if diff > 2 else ('down' if diff < -2 else 'stable')
        trend_data.append({ 'date': d, 'risk': round(r, 1), 'direction': direction })

    # Determine status
    if high_risk_streak >= 3:
        return {
            "status":       "burnout_warning",
            "level":        "critical",
            "title":        "?? Burnout Warning!",
            "message":      f"Your risk has been critically high for {high_risk_streak} days in a row. Immediate action needed.",
            "trend":        trend_data,
            "days_at_risk": high_risk_streak,
            "advice": [
                "Take a complete digital detox day",
                "Sleep at least 8 hours tonight",
                "Spend 30+ minutes outside",
                "Limit social media to 30 min tomorrow",
                "Talk to someone you trust"
            ]
        }

    if increasing and last3[2] >= 50:
        rise = round(last3[2] - last3[0], 1)
        return {
            "status":       "risk_rising",
            "level":        "warning",
            "title":        "?? Risk Trending Up",
            "message":      f"Your risk score has risen {rise} points over 3 days. Take action before it gets worse.",
            "trend":        trend_data,
            "days_at_risk": 3,
            "advice": [
                "Reduce screen time by 1 hour tomorrow",
                "No phones 1 hour before bed",
                "Take a 15-min walk after meals",
                "Turn off non-essential notifications"
            ]
        }

    if moderate_streak >= 3:
        return {
            "status":       "sustained_moderate",
            "level":        "caution",
            "title":        "?? Sustained Moderate Risk",
            "message":      f"{moderate_streak} days of moderate risk. Small changes now prevent burnout later.",
            "trend":        trend_data,
            "days_at_risk": moderate_streak,
            "advice": [
                "Set a daily screen time limit",
                "Schedule one screen-free hour per day",
                "Prioritize 7-8 hours of sleep"
            ]
        }

    if decreasing and last3[2] < last3[0]:
        drop = round(last3[0] - last3[2], 1)
        return {
            "status":       "improving",
            "level":        "good",
            "title":        "?? You're Improving!",
            "message":      f"Risk dropped {drop} points in 3 days. Keep up the great work!",
            "trend":        trend_data,
            "days_at_risk": 0,
            "advice": [
                "Keep your current routine going",
                "Maintain your sleep schedule",
                "You're doing great � stay consistent!"
            ]
        }

    return {
        "status":       "stable",
        "level":        "stable",
        "title":        "? Risk is Stable",
        "message":      "No burnout risk detected. Keep logging daily to stay on track.",
        "trend":        trend_data,
        "days_at_risk": 0,
        "advice":       ["Keep logging daily", "Maintain your current habits"]
    }

@router.get("/burnout")
def get_burnout_prediction(
    current_user = Depends(get_current_user),
    db: Session  = Depends(get_db)
):
    today = date.today()
    logs = (
        db.query(DailyLogModel)
        .filter(DailyLogModel.user_id == current_user.user_id)
        .order_by(DailyLogModel.log_date.desc())
        .limit(7)
        .all()
    )
    if len(logs) < 3:
        return {
            "status": "insufficient_data",
            "level": "none",
            "title": "Not enough data",
            "message": "Log at least 3 days to get burnout prediction.",
            "trend": [], "days_at_risk": 0, "advice": []
        }

    logs_sorted = sorted(logs, key=lambda l: l.log_date)
    risks = [float(l.addiction_risk_score or 0) for l in logs_sorted]
    dates = [l.log_date.strftime("%d/%m") for l in logs_sorted]

    last3 = risks[-3:]
    increasing = last3[0] < last3[1] < last3[2]
    decreasing = last3[0] > last3[1] > last3[2]

    high_risk_streak = 0
    for r in reversed(risks):
        if r >= 75:
            high_risk_streak += 1
        else:
            break

    moderate_streak = 0
    for r in reversed(risks):
        if r >= 50:
            moderate_streak += 1
        else:
            break

    trend_data = []
    for i, (d, r) in enumerate(zip(dates, risks)):
        direction = None
        if i > 0:
            diff = r - risks[i-1]
            direction = "up" if diff > 2 else ("down" if diff < -2 else "stable")
        trend_data.append({"date": d, "risk": round(r, 1), "direction": direction})

    if high_risk_streak >= 3:
        return {
            "status": "burnout_warning", "level": "critical",
            "title": "Burnout Warning!",
            "message": f"Risk critically high for {high_risk_streak} days. Immediate action needed.",
            "trend": trend_data, "days_at_risk": high_risk_streak,
            "advice": [
                "Take a complete digital detox day",
                "Sleep at least 8 hours tonight",
                "Spend 30+ minutes outside",
                "Limit social media to 30 min tomorrow",
                "Talk to someone you trust"
            ]
        }

    if increasing and last3[2] >= 50:
        rise = round(last3[2] - last3[0], 1)
        return {
            "status": "risk_rising", "level": "warning",
            "title": "Risk Trending Up",
            "message": f"Risk rose {rise} points over 3 days. Act before it gets worse.",
            "trend": trend_data, "days_at_risk": 3,
            "advice": [
                "Reduce screen time by 1 hour tomorrow",
                "No phones 1 hour before bed",
                "Take a 15-min walk after meals",
                "Turn off non-essential notifications"
            ]
        }

    if moderate_streak >= 3:
        return {
            "status": "sustained_moderate", "level": "caution",
            "title": "Sustained Moderate Risk",
            "message": f"{moderate_streak} days of moderate risk. Small changes now prevent burnout.",
            "trend": trend_data, "days_at_risk": moderate_streak,
            "advice": [
                "Set a daily screen time limit",
                "Schedule one screen-free hour per day",
                "Prioritize 7-8 hours of sleep"
            ]
        }

    if decreasing and last3[2] < last3[0]:
        drop = round(last3[0] - last3[2], 1)
        return {
            "status": "improving", "level": "good",
            "title": "You are Improving!",
            "message": f"Risk dropped {drop} points in 3 days. Keep it up!",
            "trend": trend_data, "days_at_risk": 0,
            "advice": [
                "Keep your current routine going",
                "Maintain your sleep schedule",
                "You are doing great, stay consistent!"
            ]
        }

    return {
        "status": "stable", "level": "stable",
        "title": "Risk is Stable",
        "message": "No burnout risk detected. Keep logging daily.",
        "trend": trend_data, "days_at_risk": 0,
        "advice": ["Keep logging daily", "Maintain your current habits"]
    }