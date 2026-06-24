# train_model.py
# This script trains a machine learning model on our behavioral data
# and saves it to disk so the backend can use it.

import pandas as pd
import numpy as np
import os
import pickle    # Saves Python objects to files

# scikit-learn: the ML library
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler

# -------------------------------------------------------
# STEP 1: LOAD DATA
# -------------------------------------------------------

print("Step 1: Loading data...")
logs_df = pd.read_csv("data/raw/daily_logs.csv")
print(f"  Loaded {len(logs_df)} records")

# -------------------------------------------------------
# STEP 2: DEFINE FEATURES AND TARGET
# -------------------------------------------------------

# Features (X) = the inputs the model will learn from
# Target  (y) = what the model will predict
#
# Think of it like studying for an exam:
# X = your study habits, sleep, practice tests
# y = your final exam score

print("\nStep 2: Preparing features and target...")

FEATURE_COLUMNS = [
    'screen_time_hours',
    'social_media_hours',
    'gaming_hours',
    'study_hours',
    'sleep_hours',
    'mood_score',
    'productivity_score',
    'notifications_checked',
    'outside_time_minutes'
]

# X is a DataFrame with only the input columns
X = logs_df[FEATURE_COLUMNS]

# y is a Series with only the target column
y = logs_df['addiction_risk_score']

print(f"  Features (X): {X.shape[1]} columns, {X.shape[0]} rows")
print(f"  Target   (y): {y.shape[0]} values")
print(f"  Features used: {', '.join(FEATURE_COLUMNS)}")

# -------------------------------------------------------
# STEP 3: SPLIT DATA INTO TRAINING AND TESTING SETS
# -------------------------------------------------------

# Critical concept: we NEVER test a model on data it trained on.
# That would be like giving students the exact exam they studied from —
# it proves nothing about real understanding.
#
# We split data:
# - Training set (80%): model learns from this
# - Test set    (20%): we evaluate the model on this — it's "unseen"
#
# test_size=0.2 means 20% goes to testing
# random_state=42 makes the split reproducible every time

print("\nStep 3: Splitting into train/test sets...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

print(f"  Training set: {len(X_train)} records (80%)")
print(f"  Test set:     {len(X_test)} records  (20%)")

# -------------------------------------------------------
# STEP 4: SCALE THE FEATURES
# -------------------------------------------------------

# Different features have very different ranges:
# - sleep_hours: 4 to 9
# - notifications_checked: 10 to 150
# Without scaling, the model treats notifications as 30x more important
# just because the numbers are bigger — which is wrong.
#
# StandardScaler transforms each feature to have mean=0, std=1
# Now all features are on equal footing.

print("\nStep 4: Scaling features...")

scaler = StandardScaler()

# fit_transform: learn the mean/std from training data, then transform it
# We only fit on training data — never on test data
# (fitting on test data would be "cheating" — leaking future info)
X_train_scaled = scaler.fit_transform(X_train)

# transform only: use the same mean/std learned from training data
X_test_scaled = scaler.transform(X_test)

print("  Features scaled successfully")

# -------------------------------------------------------
# STEP 5: TRAIN THE MODEL
# -------------------------------------------------------

# RandomForestRegressor: builds 200 decision trees and averages results
# n_estimators=200: number of trees (more = more accurate but slower)
# max_depth=15: how deep each tree can grow (prevents overfitting)
# random_state=42: makes results reproducible

print("\nStep 5: Training Random Forest model...")
print("  (This may take 10-20 seconds...)")

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1    # Use all CPU cores for faster training
)

# .fit() is where learning happens
# The model analyzes patterns between X_train and y_train
model.fit(X_train_scaled, y_train)

print("  Model trained successfully!")

# -------------------------------------------------------
# STEP 6: EVALUATE THE MODEL
# -------------------------------------------------------

# Now we test on data the model has NEVER seen
print("\nStep 6: Evaluating model performance...")

y_pred = model.predict(X_test_scaled)

# MAE: Mean Absolute Error
# On average, how many points off is our prediction?
# If MAE = 3.5, we're typically wrong by ±3.5 points out of 100
mae = mean_absolute_error(y_test, y_pred)

# R² Score: how much of the variation in risk scores does our model explain?
# 1.0 = perfect, 0.0 = no better than guessing the average
r2 = r2_score(y_test, y_pred)

print(f"\n  MODEL PERFORMANCE REPORT")
print(f"  {'─' * 35}")
print(f"  Mean Absolute Error (MAE): {mae:.2f} points")
print(f"  R² Score:                  {r2:.4f}")
print(f"  Accuracy interpretation:")

if mae < 5:
    print(f"  ✅ Excellent — predictions within ±{mae:.1f} points")
elif mae < 10:
    print(f"  ✅ Good — predictions within ±{mae:.1f} points")
else:
    print(f"  ⚠️  Fair — predictions within ±{mae:.1f} points")

# Show some example predictions vs actual
print(f"\n  Sample predictions vs actual (first 8):")
print(f"  {'Predicted':>12}  {'Actual':>8}  {'Difference':>12}")
print(f"  {'─'*36}")
for pred, actual in list(zip(y_pred[:8], y_test[:8])):
    diff = pred - actual
    print(f"  {pred:>12.1f}  {actual:>8.1f}  {diff:>+12.1f}")

# -------------------------------------------------------
# STEP 7: FEATURE IMPORTANCE
# -------------------------------------------------------

# Random Forest can tell us which features it found most useful.
# This is one of the most valuable insights in ML —
# it tells us WHAT actually drives addiction risk.

print(f"\n  Feature Importance (which behaviors matter most):")
print(f"  {'─' * 45}")

importances = model.feature_importances_
feature_importance_pairs = sorted(
    zip(FEATURE_COLUMNS, importances),
    key=lambda x: x[1],
    reverse=True
)

for feature, importance in feature_importance_pairs:
    bar = "█" * int(importance * 50)
    print(f"  {feature:<28} {importance:.3f}  {bar}")

# -------------------------------------------------------
# STEP 8: SAVE THE MODEL AND SCALER
# -------------------------------------------------------

# We save using pickle — it serializes Python objects to binary files.
# The backend will load these saved files to make predictions
# without retraining every time.

print(f"\nStep 7: Saving model and scaler...")

os.makedirs("ml_model/trained_models", exist_ok=True)

# Save the trained model
with open("ml_model/trained_models/risk_model.pkl", "wb") as f:
    pickle.dump(model, f)

# Save the scaler — we MUST use the same scaler for predictions
# as we used for training, otherwise results will be wrong
with open("ml_model/trained_models/scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)

# Save feature column names — ensures correct column order later
with open("ml_model/trained_models/feature_columns.pkl", "wb") as f:
    pickle.dump(FEATURE_COLUMNS, f)

print("  Saved: ml_model/trained_models/risk_model.pkl")
print("  Saved: ml_model/trained_models/scaler.pkl")
print("  Saved: ml_model/trained_models/feature_columns.pkl")

print("\n" + "=" * 50)
print("PHASE 3 MODEL TRAINING COMPLETE")
print("=" * 50)
print("Next step: use scorer.py to make predictions")