/**
 * Determines the next step in the measurement flow based on the checklist.
 * 
 * @param {string} currentStepId - The ID of the current step ('bmi', 'bodytemp', 'max30102', 'bloodpressure')
 * @param {Array} checklist - Array of selected step IDs
 * @returns {string} The route path for the next step, or '/measure/result' if finished.
 */
export const getNextStepPath = (currentStepId, checklist) => {
    // Default flow if no checklist is present (fallback for backward compatibility)
    if (!checklist || !Array.isArray(checklist) || checklist.length === 0) {
        switch (currentStepId) {
            case 'bmi': return '/measure/bodytemp';
            case 'bodytemp': return '/measure/max30102';
            case 'max30102': return '/measure/bloodpressure';
            case 'bloodpressure': return '/measure/ai-loading';
            default: return '/measure/ai-loading';
        }
    }

    const currentIndex = checklist.indexOf(currentStepId);

    // If current step is not found or is the last one, go to result
    if (currentIndex === -1 || currentIndex === checklist.length - 1) {
        return '/measure/ai-loading';
    }

    // Get next step ID
    const nextStepId = checklist[currentIndex + 1];

    // Map ID to route
    switch (nextStepId) {
        case 'bmi': return '/measure/bmi';
        case 'bodytemp': return '/measure/bodytemp';
        case 'max30102': return '/measure/max30102';
        case 'bloodpressure': return '/measure/bloodpressure';
        default: return '/measure/ai-loading';
    }
};

/**
 * Calculates progress information based on the checklist.
 * 
 * @param {string} currentStepId - The ID of the current step
 * @param {Array} checklist - Array of selected step IDs
 * @returns {Object} { currentStep, totalSteps, percentage }
 */
export const getProgressInfo = (currentStepId, checklist) => {
    // Default values if no checklist (fallback)
    const defaultOrder = ['bmi', 'bodytemp', 'max30102', 'bloodpressure'];

    const list = (checklist && Array.isArray(checklist) && checklist.length > 0)
        ? checklist
        : defaultOrder;

    const totalSteps = list.length;
    // 1-based index
    const currentStep = list.indexOf(currentStepId) + 1;

    // If step not found (shouldn't happen in normal flow), default to 1
    const safeCurrentStep = currentStep > 0 ? currentStep : 1;

    const percentage = Math.round((safeCurrentStep / totalSteps) * 100);

    return {
        currentStep: safeCurrentStep,
        totalSteps,
        percentage
    };
};
