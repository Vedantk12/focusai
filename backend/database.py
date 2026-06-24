# database.py
# Handles all reading and writing of data to CSV files.
# This is our "database" for now — simple but functional.
# In Phase 6 we'll replace this with PostgreSQL.

import pandas as pd
import os
import uuid
from datetime import datetime

# Where all data files live
DATA_DIR = "data/raw"

# File paths
USERS_FILE      = f"{DATA_DIR}/users.csv"
LOGS_FILE       = f"{DATA_DIR}/daily_logs.csv"
SESSIONS_FILE   = f"{DATA_DIR}/sessions.csv"

# Column definitions — ensures consistent structure
USER_COLUMNS = [
    "user_id", "name", "email",
    "hashed_password", "age", "occupation", "created_at"
]

LOG_COLUMNS = [
    "log_id", "user_id", "log_date",
    "screen_time_hours", "social_media_hours", "gaming_hours",
    "study_hours", "sleep_hours", "mood_score", "productivity_score",
    "notifications_checked", "outside_time_minutes",
    "addiction_risk_score", "focus_score", "productivity_score_ai"
]


def _ensure_files_exist():
    """Create CSV files with headers if they don't exist yet."""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    if not os.path.exists(USERS_FILE):
        pd.DataFrame(columns=USER_COLUMNS).to_csv(USERS_FILE, index=False)
    
    if not os.path.exists(LOGS_FILE):
        pd.DataFrame(columns=LOG_COLUMNS).to_csv(LOGS_FILE, index=False)


# --- USER OPERATIONS ---

def get_user_by_email(email: str):
    """
    Looks up a user by their email address.
    Returns a dict if found, None if not found.
    """
    _ensure_files_exist()
    df = pd.read_csv(USERS_FILE)
    
    # Boolean mask: creates a True/False series for each row
    match = df[df['email'] == email]
    
    if match.empty:
        return None
    
    # .iloc[0] gets the first matching row
    # .to_dict() converts it to a regular Python dict
    return match.iloc[0].to_dict()


def get_user_by_id(user_id: str):
    """Looks up a user by their ID."""
    _ensure_files_exist()
    df = pd.read_csv(USERS_FILE)
    match = df[df['user_id'] == user_id]
    
    if match.empty:
        return None
    return match.iloc[0].to_dict()


def create_user(name: str, email: str, hashed_password: str,
                age: int, occupation: str) -> dict:
    """
    Creates a new user record and saves it to CSV.
    Returns the created user dict.
    """
    _ensure_files_exist()
    
    new_user = {
        "user_id":         str(uuid.uuid4()),
        "name":            name,
        "email":           email,
        "hashed_password": hashed_password,
        "age":             age,
        "occupation":      occupation,
        "created_at":      datetime.now().isoformat()
    }
    
    df = pd.read_csv(USERS_FILE)
    
    # pd.concat joins two DataFrames together vertically
    new_row = pd.DataFrame([new_user])
    df = pd.concat([df, new_row], ignore_index=True)
    df.to_csv(USERS_FILE, index=False)
    
    return new_user

def create_user(name, email, hashed_password, age, occupation):
    _ensure_files_exist()
    
    new_user = {
        "user_id":         str(uuid.uuid4()),
        "name":            name,
        "email":           email,
        "hashed_password": hashed_password,
        "age":             age,
        "occupation":      occupation,
        "created_at":      datetime.now().isoformat()
    }
    
    df = pd.read_csv(USERS_FILE)
    
    # ADD THIS LINE temporarily to debug
    print(f"DEBUG: Saving user {email}, hash starts with: {hashed_password[:10]}")
    
    new_row = pd.DataFrame([new_user])
    df = pd.concat([df, new_row], ignore_index=True)
    df.to_csv(USERS_FILE, index=False)
    
    return new_user

def email_exists(email: str) -> bool:
    """Check if an email is already registered."""
    return get_user_by_email(email) is not None


# --- LOG OPERATIONS ---

def save_log(log_data: dict) -> dict:
    """
    Saves a daily log entry to CSV.
    log_data should include scores already calculated.
    """
    _ensure_files_exist()
    
    log_data['log_id'] = str(uuid.uuid4())
    log_data['log_date'] = datetime.now().date().isoformat()
    
    df = pd.read_csv(LOGS_FILE)
    new_row = pd.DataFrame([log_data])
    df = pd.concat([df, new_row], ignore_index=True)
    df.to_csv(LOGS_FILE, index=False)
    
    return log_data


def get_logs_for_user(user_id: str, limit: int = 30) -> list:
    """
    Returns the most recent `limit` logs for a user.
    """
    _ensure_files_exist()
    df = pd.read_csv(LOGS_FILE)
    
    # Filter for this user only
    user_logs = df[df['user_id'] == user_id]
    
    # Sort by date, most recent first
    if not user_logs.empty and 'log_date' in user_logs.columns:
        user_logs = user_logs.sort_values('log_date', ascending=False)
    
    # Return as list of dicts, limited to `limit` entries
    return user_logs.head(limit).to_dict(orient='records')


def get_latest_scores(user_id: str) -> dict:
    """Returns the most recent scores for a user."""
    logs = get_logs_for_user(user_id, limit=1)
    
    if not logs:
        return None
    
    latest = logs[0]
    return {
        "addiction_risk_score":  latest.get("addiction_risk_score", 0),
        "focus_score":           latest.get("focus_score", 0),
        "productivity_score_ai": latest.get("productivity_score_ai", 0),
        "log_date":              latest.get("log_date", ""),
        "risk_category":         _get_category(latest.get("addiction_risk_score", 0))
    }


def _get_category(score) -> str:
    score = float(score) if score else 0
    if score < 25:   return "Low"
    if score < 50:   return "Moderate"
    if score < 75:   return "High"
    return "Critical"