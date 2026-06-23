# project_info.py
# This file stores basic information about the FocusAI project.

# Variables store data. The = sign assigns a value to a name.
project_name = "FocusAI"
version = "0.1.0"
description = "AI-powered digital addiction detection and prevention system"

# A list stores multiple items in order
target_users = ["students", "young professionals", "parents"]

# A dictionary stores key-value pairs, like a real dictionary
scores_we_will_generate = {
    "addiction_risk_score": "0 to 100 - higher means more at risk",
    "focus_score": "0 to 100 - higher means better focus",
    "productivity_score": "0 to 100 - higher means more productive"
}

# print() outputs text to the terminal
print(f"Project: {project_name} v{version}")
print(f"Description: {description}")
print(f"Target users: {', '.join(target_users)}")
print("\nScores this system will generate:")

# A for loop repeats code for each item in a collection
for score_name, explanation in scores_we_will_generate.items():
    print(f"  - {score_name}: {explanation}")