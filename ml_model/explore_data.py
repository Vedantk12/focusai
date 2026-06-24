# explore_data.py
# Before training any model, a data scientist always explores the data.
# This is called EDA — Exploratory Data Analysis.
# Goal: understand what's in our data, spot problems, find patterns.

import pandas as pd
import numpy as np
import os

def load_data():
    """Load the CSV files we generated in Phase 2."""
    
    logs_path = "data/raw/daily_logs.csv"
    users_path = "data/raw/users.csv"
    
    # Check files exist before loading
    if not os.path.exists(logs_path):
        print("ERROR: data/raw/daily_logs.csv not found.")
        print("Run: python data/generate_data.py first.")
        return None, None
    
    # pd.read_csv loads a CSV file into a DataFrame (a table in Python)
    logs_df = pd.read_csv(logs_path)
    users_df = pd.read_csv(users_path)
    
    return logs_df, users_df


def explore(logs_df, users_df):
    """Print a full analysis of the dataset."""
    
    print("=" * 50)
    print("FOCUSAI DATA EXPLORATION REPORT")
    print("=" * 50)
    
    # --- Basic shape ---
    # .shape returns (number of rows, number of columns)
    print(f"\nDaily logs: {logs_df.shape[0]} rows, {logs_df.shape[1]} columns")
    print(f"Users:      {users_df.shape[0]} rows, {users_df.shape[1]} columns")
    
    # --- Column names ---
    print(f"\nColumns in daily_logs:")
    for col in logs_df.columns:
        print(f"  - {col}")
    
    # --- Data types ---
    # Knowing types matters — ML models need numbers, not text
    print(f"\nData types:")
    print(logs_df.dtypes)
    
    # --- Check for missing values ---
    # Missing values break ML models — we need to know if any exist
    print(f"\nMissing values per column:")
    missing = logs_df.isnull().sum()
    if missing.sum() == 0:
        print("  None! Clean dataset.")
    else:
        print(missing[missing > 0])
    
    # --- Statistical summary ---
    # .describe() gives count, mean, min, max, and percentiles
    print(f"\nStatistical summary of behavioral features:")
    
    # Select only the behavior columns (not IDs or dates)
    feature_cols = [
        'screen_time_hours', 'social_media_hours', 'gaming_hours',
        'study_hours', 'sleep_hours', 'mood_score', 'productivity_score',
        'notifications_checked', 'outside_time_minutes'
    ]
    print(logs_df[feature_cols].describe().round(2))
    
    # --- Target variable analysis ---
    print(f"\nAddiction Risk Score distribution:")
    risk = logs_df['addiction_risk_score']
    print(f"  Mean:   {risk.mean():.1f}")
    print(f"  Median: {risk.median():.1f}")
    print(f"  Std:    {risk.std():.1f}")
    print(f"  Min:    {risk.min():.1f}")
    print(f"  Max:    {risk.max():.1f}")
    
    # --- Risk categories ---
    low    = (risk < 33).sum()
    medium = ((risk >= 33) & (risk < 66)).sum()
    high   = (risk >= 66).sum()
    total  = len(risk)
    
    print(f"\nRisk category breakdown:")
    print(f"  Low    (0-32):   {low:4d} entries  ({low/total*100:.1f}%)")
    print(f"  Medium (33-65): {medium:4d} entries  ({medium/total*100:.1f}%)")
    print(f"  High   (66-100): {high:4d} entries  ({high/total*100:.1f}%)")
    
    # --- Correlations with risk score ---
    # Correlation tells us how strongly each feature relates to risk
    # +1.0 = perfect positive link, -1.0 = perfect negative link, 0 = no link
    print(f"\nCorrelation of each feature with addiction_risk_score:")
    print("(closer to 1.0 or -1.0 = stronger relationship)")
    
    all_cols = feature_cols + ['addiction_risk_score']
    corr = logs_df[all_cols].corr()['addiction_risk_score'].drop('addiction_risk_score')
    
    # Sort by absolute value so strongest relationships appear first
    corr_sorted = corr.abs().sort_values(ascending=False)
    
    for feature in corr_sorted.index:
        value = corr[feature]
        direction = "↑ risk" if value > 0 else "↓ risk"
        bar = "█" * int(abs(value) * 20)
        print(f"  {feature:<28} {value:+.3f}  {direction}  {bar}")
    
    print("\n" + "=" * 50)
    print("Exploration complete. Ready to train the model.")
    print("=" * 50)


if __name__ == "__main__":
    logs_df, users_df = load_data()
    if logs_df is not None:
        explore(logs_df, users_df)