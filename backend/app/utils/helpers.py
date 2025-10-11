# Utility functions

def validate_temperature(temp):
    """Validate if temperature is in human range"""
    return 35.0 <= temp <= 42.0

def calculate_bmi(weight_kg, height_cm):
    """Calculate BMI from weight and height"""
    height_m = height_cm / 100
    if height_m > 0:
        return weight_kg / (height_m * height_m)
    return 0