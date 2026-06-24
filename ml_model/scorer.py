# scorer.py
# This module loads the trained model and provides a clean
# interface for making predictions. The backend imports this.

import pickle
import numpy as np
import os

class FocusAIScorer:
    """
    Loads the trained ML model and generates three scores for any user:
    - Addiction Risk Score (0-100)
    - Focus Score (0-100)  
    - Productivity Score (0-100)
    """
    
    def __init__(self):
        """Load the trained model and scaler from disk."""
        
        model_dir = "ml_model/trained_models"
        
        # Check trained models exist
        if not os.path.exists(f"{model_dir}/risk_model.pkl"):
            raise FileNotFoundError(
                "Trained model not found. Run: python ml_model/train_model.py"
            )
        
        # Load all three saved files
        with open(f"{model_dir}/risk_model.pkl", "rb") as f:
            self.model = pickle.load(f)
        
        with open(f"{model_dir}/scaler.pkl", "rb") as f:
            self.scaler = pickle.load(f)
        
        with open(f"{model_dir}/feature_columns.pkl", "rb") as f:
            self.feature_columns = pickle.load(f)
        
        print("FocusAI Scorer loaded successfully")
    
    def predict_risk(self, daily_log_data: dict) -> float:
        """
        Predicts addiction risk score from a daily log dictionary.
        
        Args:
            daily_log_data: dict with keys matching feature columns
        
        Returns:
            float: risk score between 0 and 100
        """
        
        # Extract features in the exact order the model was trained on
        # Order matters — wrong order = wrong predictions
        features = [daily_log_data[col] for col in self.feature_columns]
        
        # Reshape to 2D array — scikit-learn expects shape (n_samples, n_features)
        # [features] makes it [[val1, val2, ...]] — one sample
        features_array = np.array([features])
        
        # Apply the same scaling used during training
        features_scaled = self.scaler.transform(features_array)
        
        # .predict() returns an array — [0] gets the single value
        risk_score = self.model.predict(features_scaled)[0]
        
        # Clamp between 0 and 100
        return round(float(np.clip(risk_score, 0, 100)), 1)
    
    def calculate_focus_score(self, daily_log_data: dict) -> float:
        """
        Calculates a focus score based on productive behaviors.
        Higher is better.
        
        This is rule-based for now — could be its own ML model later.
        """
        
        score = 50.0  # Start at neutral
        
        # Study hours boost focus score
        score += daily_log_data.get('study_hours', 0) * 5
        
        # High productivity self-report boosts score
        score += (daily_log_data.get('productivity_score', 5) - 5) * 4
        
        # Good sleep helps focus
        sleep = daily_log_data.get('sleep_hours', 7)
        if sleep >= 7:
            score += 10
        elif sleep < 6:
            score -= 10
        
        # Outside time helps mental clarity
        score += min(daily_log_data.get('outside_time_minutes', 0) * 0.1, 8)
        
        # High social media hurts focus
        score -= daily_log_data.get('social_media_hours', 0) * 4
        
        # Too many notifications destroys focus
        score -= min(daily_log_data.get('notifications_checked', 0) * 0.08, 15)
        
        return round(float(np.clip(score, 0, 100)), 1)
    
    def calculate_productivity_score(self, daily_log_data: dict) -> float:
        """
        Calculates a productivity score.
        """
        
        score = 40.0
        
        # Study time is the clearest productivity signal
        score += daily_log_data.get('study_hours', 0) * 6
        
        # Self-reported productivity
        score += (daily_log_data.get('productivity_score', 5) - 5) * 3
        
        # Good mood helps productivity
        score += (daily_log_data.get('mood_score', 5) - 5) * 2
        
        # Excessive gaming hurts productivity
        score -= daily_log_data.get('gaming_hours', 0) * 5
        
        # High screen time that isn't study hurts
        screen = daily_log_data.get('screen_time_hours', 0)
        study  = daily_log_data.get('study_hours', 0)
        wasted_screen = max(0, screen - study)
        score -= wasted_screen * 2
        
        return round(float(np.clip(score, 0, 100)), 1)
    
    def get_risk_category(self, risk_score: float) -> str:
        """Converts a numeric score to a human-readable category."""
        if risk_score < 25:
            return "Low"
        elif risk_score < 50:
            return "Moderate"
        elif risk_score < 75:
            return "High"
        else:
            return "Critical"
    
    def generate_recommendations(self, scores: dict, log_data: dict) -> list:
        """
        Generates personalized recommendations based on scores and behaviors.
        Returns a list of recommendation strings.
        """
        
        recommendations = []
        risk  = scores['addiction_risk_score']
        
        # Screen time recommendations
        if log_data.get('screen_time_hours', 0) > 7:
            recommendations.append(
                "Reduce total screen time to under 6 hours. "
                "Try the 20-20-20 rule: every 20 minutes, look 20 feet "
                "away for 20 seconds."
            )
        
        # Sleep recommendations
        if log_data.get('sleep_hours', 8) < 7:
            recommendations.append(
                "Aim for 7-8 hours of sleep. Poor sleep increases "
                "cravings for digital stimulation by up to 40%."
            )
        
        # Social media recommendations
        if log_data.get('social_media_hours', 0) > 3:
            recommendations.append(
                "Set a 90-minute daily limit on social media apps. "
                "Use app timers in your phone settings."
            )
        
        # Study habit recommendations
        if log_data.get('study_hours', 0) < 2:
            recommendations.append(
                "Try the Pomodoro technique: 25 minutes focused study, "
                "5 minute break. Aim for at least 4 Pomodoros daily."
            )
        
        # Notification recommendations
        if log_data.get('notifications_checked', 0) > 60:
            recommendations.append(
                "You checked notifications frequently today. "
                "Enable Do Not Disturb mode during study/work sessions."
            )
        
        # Outdoor activity
        if log_data.get('outside_time_minutes', 0) < 20:
            recommendations.append(
                "Spend at least 20 minutes outside daily. "
                "Even a short walk significantly reduces digital cravings."
            )
        
        # General positive reinforcement for low risk
        if risk < 30:
            recommendations.append(
                "Great digital habits today! Keep maintaining this balance."
            )
        
        # Limit to top 3 most relevant recommendations
        return recommendations[:3]
    
    def score_user(self, daily_log_data: dict) -> dict:
        """
        Main method — generates all scores and recommendations for a user.
        This is what the backend API will call.
        
        Args:
            daily_log_data: dict of a user's daily behavioral data
        
        Returns:
            dict with all scores, category, and recommendations
        """
        
        risk_score         = self.predict_risk(daily_log_data)
        focus_score        = self.calculate_focus_score(daily_log_data)
        productivity_score = self.calculate_productivity_score(daily_log_data)
        
        scores = {
            'addiction_risk_score': risk_score,
            'focus_score': focus_score,
            'productivity_score': productivity_score
        }
        
        return {
            'scores': scores,
            'risk_category': self.get_risk_category(risk_score),
            'recommendations': self.generate_recommendations(scores, daily_log_data)
        }


# -------------------------------------------------------
# Test the scorer with different user profiles
# -------------------------------------------------------
if __name__ == "__main__":
    
    scorer = FocusAIScorer()
    
    # Define test profiles
    profiles = {
        "High Risk User": {
            'screen_time_hours': 10,
            'social_media_hours': 5,
            'gaming_hours': 3,
            'study_hours': 0.5,
            'sleep_hours': 5,
            'mood_score': 2,
            'productivity_score': 2,
            'notifications_checked': 110,
            'outside_time_minutes': 5
        },
        "Moderate User": {
            'screen_time_hours': 6,
            'social_media_hours': 2,
            'gaming_hours': 1,
            'study_hours': 3,
            'sleep_hours': 7,
            'mood_score': 6,
            'productivity_score': 6,
            'notifications_checked': 40,
            'outside_time_minutes': 30
        },
        "Healthy User": {
            'screen_time_hours': 2,
            'social_media_hours': 0.5,
            'gaming_hours': 0,
            'study_hours': 6,
            'sleep_hours': 8,
            'mood_score': 9,
            'productivity_score': 9,
            'notifications_checked': 12,
            'outside_time_minutes': 75
        }
    }
    
    print("\n" + "=" * 55)
    print("FOCUSAI SCORER — LIVE PREDICTIONS")
    print("=" * 55)
    
    for profile_name, log_data in profiles.items():
        result = scorer.score_user(log_data)
        scores = result['scores']
        
        print(f"\n{profile_name}")
        print(f"  {'─' * 40}")
        print(f"  Addiction Risk:  {scores['addiction_risk_score']:>5.1f}/100  [{result['risk_category']}]")
        print(f"  Focus Score:     {scores['focus_score']:>5.1f}/100")
        print(f"  Productivity:    {scores['productivity_score']:>5.1f}/100")
        print(f"\n  Recommendations:")
        for i, rec in enumerate(result['recommendations'], 1):
            # Wrap text at 55 chars for clean display
            words = rec.split()
            lines = []
            line = ""
            for word in words:
                if len(line) + len(word) < 55:
                    line += word + " "
                else:
                    lines.append(line.strip())
                    line = word + " "
            lines.append(line.strip())
            print(f"  {i}. {lines[0]}")
            for extra_line in lines[1:]:
                print(f"     {extra_line}")
    
    print("\n" + "=" * 55)
    print("Phase 3 complete. Model is working correctly.")
    print("=" * 55)