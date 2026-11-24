const CATEGORY_KEYWORDS = {
    BILLING: ["refund", "invoice", "charge", "payment"],
    LOGIN: ["password", "2fa", "sign in", "locked out", "login"],
    DELIVERY: ["package", "arrived", "shipping", "tracking", "delivery"],
    BUG: ["crash", "error", "500", "exception", "broken"]
};

const PRIORITY_KEYWORDS = {
    URGENT: ["urgent", "production down", "locked out"],
    HIGH: ["error", "refund", "not arrived"]
};

const classifyTicket = (subject, body) => {
    const text = `${subject} ${body}`.toLowerCase();

    let autoCategory = "FEATURE_REQUEST";

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            autoCategory = category;
            break;
        }
    }

    let priority = "MEDIUM";

    if (PRIORITY_KEYWORDS.URGENT.some(keyword => text.includes(keyword))) {
        priority = "URGENT";
    } else if (PRIORITY_KEYWORDS.HIGH.some(keyword => text.includes(keyword))) {
        priority = "HIGH";
    }

    return { autoCategory, priority };
};

module.exports = classifyTicket;