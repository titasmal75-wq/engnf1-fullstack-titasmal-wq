const RESOURCE_TYPES = ["ROOM", "LAB", "EQUIPMENT"];

const validateResource = (data, isUpdate = false) => {
    const errors = [];

    const allowedFields = isUpdate
        ? ["name", "type", "capacity", "description", "isActive"]
        : ["name", "type", "capacity", "description"];


    for (const field of Object.keys(data)) {
        if (!allowedFields.includes(field)) {
            errors.push(`Invalid field: ${field}`);
        }
    }

    if (!isUpdate || data.name !== undefined) {
        if (
            typeof data.name !== "string" ||
            data.name.trim().length < 3 ||
            data.name.trim().length > 60
        ) {
            errors.push("Name must contain 3-60 characters");
        }
    }

    if (!isUpdate || data.type !== undefined) {
        if (!RESOURCE_TYPES.includes(data.type)) {
            errors.push("Type must be ROOM, LAB or EQUIPMENT");
        }
    }

    if (!isUpdate || data.capacity !== undefined) {
        if (
            typeof data.capacity !== "number" ||
            !Number.isInteger(data.capacity) ||
            data.capacity < 1 ||
            data.capacity > 500
        ) {
            errors.push("Capacity must be an integer between 1 and 500");
        }
    }

    if (data.description !== undefined && data.description !== null) {
        if (
            typeof data.description !== "string" ||
            data.description.trim().length > 300
        ) {
            errors.push("Description must not exceed 300 characters");
        }
    }

    if (isUpdate && data.isActive !== undefined) {
        if (typeof data.isActive !== "boolean") {
            errors.push("isActive must be a boolean");
        }
    }

    if (isUpdate && Object.keys(data).length === 0) {
        errors.push("At least one field is required for update");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateResourceQuery = (query) => {
    const errors = [];

    const allowedFields = ["search", "type", "minCapacity", "page"];

    for (const field of Object.keys(query)) {
        if (!allowedFields.includes(field)) {
            errors.push(`Invalid query parameter: ${field}`);
        }
    }

    if (
        query.search !== undefined &&
        (typeof query.search !== "string" || query.search.trim() === "")
    ) {
        errors.push("Search must be a non-empty string");
    }

    if (
        query.type !== undefined &&
        !RESOURCE_TYPES.includes(query.type)
    ) {
        errors.push("Invalid resource type");
    }

    if (query.minCapacity !== undefined) {
        if (
            !/^\d+$/.test(query.minCapacity) ||
            Number(query.minCapacity) < 1 ||
            Number(query.minCapacity) > 500
        ) {
            errors.push("minCapacity must be between 1 and 500");
        }
    }

    if (query.page !== undefined) {
        if (!/^[1-9]\d*$/.test(query.page)) {
            errors.push("Page must be a positive integer");
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const validateAvailabilityQuery = (query) => {
    const errors = [];

    const { from, to } = query;

    const isoUTC =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

    if (!from || !isoUTC.test(from) || Number.isNaN(Date.parse(from))) {
        errors.push("from must be a valid ISO UTC timestamp");
    }

    if (!to || !isoUTC.test(to) || Number.isNaN(Date.parse(to))) {
        errors.push("to must be a valid ISO UTC timestamp");
    }

    if (errors.length === 0) {
        const start = new Date(from);
        const end = new Date(to);

        if (start >= end) {
            errors.push("from must be earlier than to");
        } else if (end - start > 7 * 24 * 60 * 60 * 1000) {
            errors.push("Availability range cannot exceed 7 days");
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateResource,
    validateResourceQuery,
    validateAvailabilityQuery
};