# user.py
# This file defines what a "User" is in our system.
# In software, we use classes to represent real-world things.
# A class is like a blueprint — it describes what data a thing has
# and what actions it can perform.

import uuid          # Generates unique IDs automatically
from datetime import datetime   # Works with dates and times

class User:
    """
    Represents a person using the FocusAI app.
    
    Think of this class like a form. Every user gets their own
    filled-out copy of this form with their specific data.
    """
    
    def __init__(self, name, email, age, occupation):
        """
        __init__ is a special method called a "constructor".
        It runs automatically when you create a new User.
        The 'self' parameter refers to the specific user being created.
        """
        
        # uuid4() generates a random unique ID like "a3f8-2b91-..."
        # This ensures every user has a unique identifier
        self.user_id = str(uuid.uuid4())
        
        self.name = name
        self.email = email
        self.age = age
        
        # occupation helps us give relevant recommendations
        # e.g., students get study-focused advice
        self.occupation = occupation  # "student", "professional", "other"
        
        # datetime.now() captures the exact moment this account was created
        self.created_at = datetime.now().isoformat()
        
    def to_dict(self):
        """
        Converts this User object into a plain dictionary.
        We need this to save user data to a CSV file.
        
        A dictionary looks like: {"key": "value", "key2": "value2"}
        """
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "age": self.age,
            "occupation": self.occupation,
            "created_at": self.created_at
        }
    
    def __repr__(self):
        """
        __repr__ controls what prints when you do print(user).
        Without this, Python would print something unhelpful
        like <User object at 0x000001A2>.
        """
        return f"User(name={self.name}, email={self.email}, age={self.age})"


# ---------------------------------------------------------------
# This block only runs when you execute THIS file directly.
# It does NOT run when another file imports User.
# This is a standard Python pattern for testing your code.
# ---------------------------------------------------------------
if __name__ == "__main__":
    # Create a test user to verify the class works
    test_user = User(
        name="Vedant",
        email="vedant@example.com",
        age=21,
        occupation="student"
    )
    
    print("User created successfully:")
    print(test_user)
    print("\nAs a dictionary:")
    print(test_user.to_dict())