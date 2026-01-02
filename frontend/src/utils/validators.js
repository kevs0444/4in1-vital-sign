/**
 * Common validation utilities for the application
 */

// List of common disposable/temporary email domains to block
export const DISPOSABLE_DOMAINS = [
    "tempmail.com", "throwawaymail.com", "mailinator.com", "yopmail.com",
    "guerrillamail.com", "10minutemail.com", "sharklasers.com", "getairmail.com",
    "dispostable.com", "grr.la", "maildrop.cc", "shortmail.com", "trashmail.com",
    "33mail.com", "meltmail.com", "mailnesia.com", "mytrashmail.com",
    "temp-mail.org", "boximail.com", "emailondeck.com", "anonymousspeech.com",
    "dayrep.com", "teleworm.us", "jourrapide.com", "armyspy.com", "cuvox.de",
    "fleckens.hu", "gustr.com", "superrito.com", "rhyta.com"
];

/**
 * Validates an email address for format and legitimacy (not disposable)
 * @param {string} email 
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
    if (!email) {
        return { isValid: false, error: "Email is required" };
    }

    const trimmedEmail = email.trim();

    // 1. Strict Format Validation
    // Checks for standard email format: chars@chars.domain (min 2 chars for TLD)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
        return { isValid: false, error: "Please enter a valid email address (e.g., juan@example.com)" };
    }

    // 2. Disposable Domain Check
    const domain = trimmedEmail.split('@')[1].toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) {
        return { isValid: false, error: "Please use a legitimate personal or work email (temporary emails are not allowed)" };
    }

    return { isValid: true, error: "" };
};

/**
 * Validates an ID/School Number
 * @param {string} id 
 * @returns {boolean}
 */
export const validateIDNumber = (id) => {
    // Allow only numbers and hyphens, minimum 1 character
    const idRegex = /^[0-9-]+$/;
    return idRegex.test(id) && id.trim().length >= 1;
};

/**
 * Validates a password
 * @param {string} password 
 * @returns {boolean}
 */
export const validatePassword = (password) => {
    return password.length >= 6 && password.length <= 10;
};
