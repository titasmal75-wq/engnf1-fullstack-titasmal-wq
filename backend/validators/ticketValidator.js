const validateTicket = ({ subject, body }) => {
    const errors = [];

    if (typeof subject !== "string") {
        errors.push("Subject must be a string");
    } else {
        const trimmedSubject = subject.trim();

        if (trimmedSubject.length < 3 || trimmedSubject.length > 150) {
            errors.push("Subject must be between 3 and 150 characters");
        }
    }


    if (typeof body !== "string") {
        errors.push("Body must be a string");
    } else {
        const trimmedBody = body.trim();

        if (trimmedBody.length < 5 || trimmedBody.length > 2000) {
            errors.push("Body must be between 5 and 2000 characters");
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};


module.exports = validateTicket;
