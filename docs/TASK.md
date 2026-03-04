# Pending Tasks

1.  **Fix Data Synchronization:** Ensure the final measurement data from `Max30102` accurately syncs to the `Result` page without changing.
2.  **Auto-Calculate Age Group:** Automatically calculate the user's age group based on their inputted age in the Measurement Flow pages.
3.  **Remove AI Risk Label:** Remove the AI Risk Label from the training and inference pipeline, keeping only the numerical risk score.
4.  **Handle NaN in AI Training:** Refactor AI data generation to include combinations of `NaN` values for unselected vital signs. Age, age group, and gender are the only fixed values.
5.  **Implement K-Fold Validation:** Use K-Fold validation in the XGBoost training script to enhance accuracy.
