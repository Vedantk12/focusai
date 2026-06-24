# daily_log.py
# This defines one day's worth of behavioral data for a user.
# Every day the user logs their habits, a new DailyLog is created.

from datetime import date

class DailyLog:
    """
    Represents one day of digital behavior data for a user.
    
    Think of this as one row in a spreadsheet where each column
    is a different behavior measurement.
    """
    
    def __init__(
        self,
        user_id,
        screen_time_hours,
        social_media_hours,
        gaming_hours,
        study_hours,
        sleep_hours,
        mood_score,
        productivity_score,
        notifications_checked,
        outside_time_minutes,
        log_date=None
    ):
        self.user_id = user_id
        
        # If no date is given, use today's date automatically
        self.log_date = log_date if log_date else date.today().isoformat()
        
        # --- Behavioral inputs (what the user reports) ---
        self.screen_time_hours = screen_time_hours
        self.social_media_hours = social_media_hours
        self.gaming_hours = gaming_hours
        self.study_hours = study_hours
        self.sleep_hours = sleep_hours
        
        # mood_score: 1 = very bad, 10 = excellent
        self.mood_score = mood_score
        
        # productivity_score: 1 = very unproductive, 10 = highly productive
        self.productivity_score = productivity_score
        
        # How many times did they pick up phone to check notifications?
        self.notifications_checked = notifications_checked
        
        # Time spent outside (walking, sports, etc.)
        self.outside_time_minutes = outside_time_minutes
        
        # Calculate the addiction risk score when the log is created
        # We'll improve this calculation in Phase 3 using real ML
        self.addiction_risk_score = self._calculate_risk_score()
    
    def _calculate_risk_score(self):
        """
        A simple rule-based formula to estimate addiction risk.
        The underscore prefix (_) is a Python convention meaning
        "this is an internal method — don't call it from outside".
        
        In Phase 3, this gets replaced by a proper ML model.
        For now, this gives us realistic scores to work with.
        
        Score is from 0 (no risk) to 100 (extreme risk).
        """
        score = 0
        
        # High screen time increases risk
        # More than 6 hours is considered high risk
        score += min(self.screen_time_hours * 5, 30)
        
        # Social media and gaming are high-risk activities
        score += min(self.social_media_hours * 6, 24)
        score += min(self.gaming_hours * 4, 16)
        
        # Low sleep increases risk (less than 6 hours is bad)
        if self.sleep_hours < 6:
            score += 15
        elif self.sleep_hours < 7:
            score += 7
        
        # Low mood is correlated with overuse
        # mood_score is 1-10, lower is worse
        score += (10 - self.mood_score) * 1.5
        
        # Compulsive notification checking is a key addiction signal
        score += min(self.notifications_checked * 0.1, 10)
        
        # Study hours reduce risk (healthy digital use)
        score -= min(self.study_hours * 3, 12)
        
        # Outside time reduces risk
        score -= min(self.outside_time_minutes * 0.05, 8)
        
        # Clamp between 0 and 100 — score can't go below 0 or above 100
        return round(max(0, min(100, score)), 1)
    
    def to_dict(self):
        """Convert to dictionary for saving to CSV."""
        return {
            "user_id": self.user_id,
            "log_date": self.log_date,
            "screen_time_hours": self.screen_time_hours,
            "social_media_hours": self.social_media_hours,
            "gaming_hours": self.gaming_hours,
            "study_hours": self.study_hours,
            "sleep_hours": self.sleep_hours,
            "mood_score": self.mood_score,
            "productivity_score": self.productivity_score,
            "notifications_checked": self.notifications_checked,
            "outside_time_minutes": self.outside_time_minutes,
            "addiction_risk_score": self.addiction_risk_score
        }
    
    def __repr__(self):
        return (f"DailyLog(user={self.user_id[:8]}..., "
                f"date={self.log_date}, "
                f"risk={self.addiction_risk_score})")


if __name__ == "__main__":
    # Test with a high-risk profile
    high_risk_log = DailyLog(
        user_id="test-user-001",
        screen_time_hours=9,
        social_media_hours=4,
        gaming_hours=3,
        study_hours=1,
        sleep_hours=5,
        mood_score=3,
        productivity_score=2,
        notifications_checked=80,
        outside_time_minutes=10
    )
    
    # Test with a healthy profile
    healthy_log = DailyLog(
        user_id="test-user-002",
        screen_time_hours=3,
        social_media_hours=0.5,
        gaming_hours=0,
        study_hours=5,
        sleep_hours=8,
        mood_score=8,
        productivity_score=8,
        notifications_checked=15,
        outside_time_minutes=60
    )
    
    print("HIGH RISK profile:")
    print(f"  Risk score: {high_risk_log.addiction_risk_score}/100")
    
    print("\nHEALTHY profile:")
    print(f"  Risk score: {healthy_log.addiction_risk_score}/100")
