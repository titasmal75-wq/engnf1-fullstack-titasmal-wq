/**
 * Booking Validator
 * Validates purpose and rejection note rules:
 * - Purpose: 5 to 200 chars trimmed
 * - Rejection note: required on reject, 5 to 200 chars trimmed
 */

const validateBooking = (data) => {
    const errors = [];

    if (!data.purpose || typeof data.purpose !== "string") {
        errors.push("Purpose is required");
    } else {
        const trimmed = data.purpose.trim();
        if (trimmed.length < 5 || trimmed.length > 200) {
            errors.push("Purpose must be 5 to 200 characters trimmed");
        }
    }

    if (!data.resourceId) {
        errors.push("resourceId is required");
    }

    if (!data.startTime) {
        errors.push("startTime is required");
    }

    if (!data.endTime) {
        errors.push("endTime is required");
    }

    if (data.startTime && data.endTime) {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        if (Number.isNaN(start.getTime())) {
            errors.push("startTime must be a valid date");
        }
        if (Number.isNaN(end.getTime())) {
            errors.push("endTime must be a valid date");
        }
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start >= end) {
            errors.push("endTime must be after startTime");
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

const validateBookingReject = (data) => {
    const errors = [];

    const note = data.rejectionNote || data.rejectionReason;

    if (!note || typeof note !== "string") {
        errors.push("Rejection note is required on reject");
    } else {
        const trimmed = note.trim();
        if (trimmed.length < 5 || trimmed.length > 200) {
            errors.push("Rejection note must be 5 to 200 characters trimmed");
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

module.exports = {
    validateBooking,
    validateBookingReject,
};
