# generate_data.py
# Generates synthetic (fake but realistic) user data for ML training.
# This is standard practice — real ML projects do this all the time
# when real data isn't yet available.

import pandas as pd      # For creating and saving tables of data
import numpy as np       # For random number generation
import os                # For creating folders
import sys

# This line lets us import from the backend/models folder
# sys.path tells Python where to look for modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.models.user import User
from backend.models.daily_log import DailyLog

# Set a random seed — this makes our "random" data reproducible.
# If you use the same seed, you get the same data every time.
# Important for debugging and sharing results.
np.random.seed(42)

def generate_users(num_users=100):
    """
    Creates a list of fake users with realistic profiles.
    
    num_users: how many users to generate (default 100)
    Returns: a list of User objects
    """
    
    # Sample names for realism
    names = [
        "Aarav", "Priya", "Rohan", "Sneha", "Arjun",
        "Meera", "Karan", "Ananya", "Vikram", "Pooja",
        "Dev", "Isha", "Rahul", "Nisha", "Aditya",
        "Kavya", "Siddharth", "Riya", "Akash", "Divya"
    ]
    
    occupations = ["student", "professional", "other"]
    
    users = []
    for i in range(num_users):
        # np.random.choice picks a random item from a list
        name = np.random.choice(names) + f"_{i}"
        age = int(np.random.randint(16, 35))
        
        # Students are more common in our target audience
        # The p=[...] sets the probability of each choice
        occupation = np.random.choice(
            occupations, p=[0.6, 0.3, 0.1]
        )
        
        user = User(
            name=name,
            email=f"user{i}@focusai.com",
            age=age,
            occupation=occupation
        )
        users.append(user)
    
    return users


def generate_logs_for_user(user, num_days=30):
    """
    Generates 30 days of behavior data for one user.
    
    Different user types have different behavior patterns —
    this makes our training data more realistic.
    """
    
    logs = []
    
    # Define behavior profiles based on occupation
    # These are realistic ranges for each metric
    if user.occupation == "student":
        # Students: variable sleep, heavy social media, some gaming
        profile = {
            "screen_time": (3, 11),      # (min, max) hours
            "social_media": (1, 5),
            "gaming": (0, 4),
            "study": (1, 8),
            "sleep": (4, 9),
            "mood": (3, 9),
            "productivity": (2, 9),
            "notifications": (20, 120),
            "outside_mins": (0, 90)
        }
    elif user.occupation == "professional":
        # Professionals: better sleep, less gaming, more work stress
        profile = {
            "screen_time": (4, 10),
            "social_media": (0.5, 3),
            "gaming": (0, 2),
            "study": (0, 3),
            "sleep": (5, 8),
            "mood": (4, 9),
            "productivity": (3, 9),
            "notifications": (30, 150),
            "outside_mins": (0, 60)
        }
    else:
        # General profile
        profile = {
            "screen_time": (2, 10),
            "social_media": (0.5, 4),
            "gaming": (0, 3),
            "study": (0, 4),
            "sleep": (5, 9),
            "mood": (3, 9),
            "productivity": (2, 9),
            "notifications": (10, 100),
            "outside_mins": (0, 120)
        }
    
    for day in range(num_days):
        # np.random.uniform gives a random decimal between min and max
        # np.random.randint gives a random whole number between min and max
        
        log = DailyLog(
            user_id=user.user_id,
            screen_time_hours=round(np.random.uniform(*profile["screen_time"]), 1),
            social_media_hours=round(np.random.uniform(*profile["social_media"]), 1),
            gaming_hours=round(np.random.uniform(*profile["gaming"]), 1),
            study_hours=round(np.random.uniform(*profile["study"]), 1),
            sleep_hours=round(np.random.uniform(*profile["sleep"]), 1),
            mood_score=int(np.random.randint(*profile["mood"])),
            productivity_score=int(np.random.randint(*profile["productivity"])),
            notifications_checked=int(np.random.randint(*profile["notifications"])),
            outside_time_minutes=int(np.random.randint(*profile["outside_mins"])),
            log_date=f"2026-{(day // 30) + 1:02d}-{(day % 28) + 1:02d}"
        )
        logs.append(log)
    
    return logs


def main():
    print("Generating FocusAI training data...")
    print("=" * 40)
    
    # Step 1: Generate users
    users = generate_users(num_users=200)
    print(f"Created {len(users)} users")
    
    # Step 2: Generate daily logs for each user
    all_logs = []
    for user in users:
        logs = generate_logs_for_user(user, num_days=30)
        all_logs.extend(logs)
    
    print(f"Created {len(all_logs)} daily log entries")
    
    # Step 3: Convert to pandas DataFrames (think: Python spreadsheets)
    # A DataFrame is a table with rows and columns
    users_df = pd.DataFrame([u.to_dict() for u in users])
    logs_df = pd.DataFrame([l.to_dict() for l in all_logs])
    
    # Step 4: Save to CSV files
    # CSV = Comma Separated Values — opens in Excel, readable by pandas
    os.makedirs("data/raw", exist_ok=True)
    
    users_df.to_csv("data/raw/users.csv", index=False)
    logs_df.to_csv("data/raw/daily_logs.csv", index=False)
    
    print(f"\nFiles saved:")
    print(f"  data/raw/users.csv        ({len(users_df)} rows)")
    print(f"  data/raw/daily_logs.csv   ({len(logs_df)} rows)")
    
    # Step 5: Show a quick summary
    print(f"\nRisk score summary:")
    print(f"  Average: {logs_df['addiction_risk_score'].mean():.1f}")
    print(f"  Lowest:  {logs_df['addiction_risk_score'].min():.1f}")
    print(f"  Highest: {logs_df['addiction_risk_score'].max():.1f}")
    
    # Show distribution across risk categories
    low    = (logs_df['addiction_risk_score'] < 33).sum()
    medium = ((logs_df['addiction_risk_score'] >= 33) & 
              (logs_df['addiction_risk_score'] < 66)).sum()
    high   = (logs_df['addiction_risk_score'] >= 66).sum()
    
    print(f"\nRisk distribution:")
    print(f"  Low risk    (0-32):   {low} entries")
    print(f"  Medium risk (33-65):  {medium} entries")
    print(f"  High risk   (66-100): {high} entries")
    
    print("\nData generation complete! Ready for Phase 3 ML training.")


if __name__ == "__main__":
    main()