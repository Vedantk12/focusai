# database.py — SQLite + SQLAlchemy
# Place this file at: C:\Users\vedan\focusai\backend\database.py

import os
import uuid
from datetime import datetime, date

from sqlalchemy import (
    create_engine, Column, String, Float,
    Integer, DateTime, Date, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Absolute path — works regardless of startup directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH  = os.path.join(BASE_DIR, "data", "focusai.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# -------------------------------------------------------
# TABLE DEFINITIONS
# -------------------------------------------------------

class UserModel(Base):
    __tablename__ = "users"

    user_id         = Column(String,  primary_key=True)
    name            = Column(String,  nullable=False)
    email           = Column(String,  nullable=False, unique=True, index=True)
    hashed_password = Column(String,  nullable=False)
    age             = Column(Integer, nullable=False)
    occupation      = Column(String,  nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)


class DailyLogModel(Base):
    __tablename__ = "daily_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "log_date", name="uq_user_date"),
    )

    log_id                = Column(String,  primary_key=True)
    user_id               = Column(String,  nullable=False, index=True)
    log_date              = Column(Date,    nullable=False, index=True)
    screen_time_hours     = Column(Float,   nullable=False)
    social_media_hours    = Column(Float,   nullable=False)
    gaming_hours          = Column(Float,   nullable=False)
    study_hours           = Column(Float,   nullable=False)
    sleep_hours           = Column(Float,   nullable=False)
    mood_score            = Column(Integer, nullable=False)
    productivity_score    = Column(Integer, nullable=False)
    notifications_checked = Column(Integer, nullable=False)
    outside_time_minutes  = Column(Integer, nullable=False)
    addiction_risk_score  = Column(Float)
    focus_score           = Column(Float)
    productivity_score_ai = Column(Float)
    risk_category         = Column(String)
    created_at            = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at            = Column(DateTime, default=datetime.utcnow, nullable=False)


# -------------------------------------------------------
# INIT
# -------------------------------------------------------

def init_db():
    Base.metadata.create_all(bind=engine)
    print(f"[DB] SQLite ready: {DB_PATH}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -------------------------------------------------------
# USER FUNCTIONS
# -------------------------------------------------------

def get_user_by_email(db: Session, email: str):
    return db.query(UserModel).filter(UserModel.email == email).first()


def get_user_by_id(db: Session, user_id: str):
    return db.query(UserModel).filter(UserModel.user_id == user_id).first()


def email_exists(db: Session, email: str) -> bool:
    return get_user_by_email(db, email) is not None


def create_user(db: Session, name, email, hashed_password, age, occupation):
    user = UserModel(
        user_id         = str(uuid.uuid4()),
        name            = name,
        email           = email,
        hashed_password = hashed_password,
        age             = age,
        occupation      = occupation
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def user_to_dict(user: UserModel) -> dict:
    return {
        "user_id":    user.user_id,
        "name":       user.name,
        "email":      user.email,
        "age":        user.age,
        "occupation": user.occupation,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# -------------------------------------------------------
# LOG FUNCTIONS
# -------------------------------------------------------

def get_log_by_user_and_date(db: Session, user_id: str, log_date: date):
    return (
        db.query(DailyLogModel)
        .filter(
            DailyLogModel.user_id  == user_id,
            DailyLogModel.log_date == log_date
        )
        .first()
    )


def get_latest_log(db: Session, user_id: str):
    return (
        db.query(DailyLogModel)
        .filter(DailyLogModel.user_id == user_id)
        .order_by(DailyLogModel.log_date.desc())
        .first()
    )


def get_logs_for_user(db: Session, user_id: str, limit: int = 30):
    return (
        db.query(DailyLogModel)
        .filter(DailyLogModel.user_id == user_id)
        .order_by(DailyLogModel.log_date.desc())
        .limit(limit)
        .all()
    )


def upsert_log(db: Session, user_id: str, log_date: date, log_data: dict):
    """
    Creates a new log OR updates the existing one for (user_id, log_date).
    Returns (log, was_created).
    """
    existing = get_log_by_user_and_date(db, user_id, log_date)

    if existing is None:
        record = DailyLogModel(
            log_id   = str(uuid.uuid4()),
            user_id  = user_id,
            log_date = log_date,
            **log_data
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record, True
    else:
        for k, v in log_data.items():
            setattr(existing, k, v)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing, False


def log_to_dict(log: DailyLogModel) -> dict:
    return {
        "log_id":                log.log_id,
        "user_id":               log.user_id,
        "log_date":              log.log_date.isoformat(),
        "screen_time_hours":     log.screen_time_hours,
        "social_media_hours":    log.social_media_hours,
        "gaming_hours":          log.gaming_hours,
        "study_hours":           log.study_hours,
        "sleep_hours":           log.sleep_hours,
        "mood_score":            log.mood_score,
        "productivity_score":    log.productivity_score,
        "notifications_checked": log.notifications_checked,
        "outside_time_minutes":  log.outside_time_minutes,
        "addiction_risk_score":  log.addiction_risk_score,
        "focus_score":           log.focus_score,
        "productivity_score_ai": log.productivity_score_ai,
        "risk_category":         log.risk_category,
        "created_at":            log.created_at.isoformat() if log.created_at else None,
        "updated_at":            log.updated_at.isoformat() if log.updated_at else None,
    }