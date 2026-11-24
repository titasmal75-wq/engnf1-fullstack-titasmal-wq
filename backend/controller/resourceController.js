const mongoose = require("mongoose");

const Resource = require("../models/Resource");
const Booking = require("../models/Booking");

const { validateResource, validateResourceQuery, validateAvailabilityQuery } = require("../validators/resourceValidator");

const isValidId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};


const getResources = async (req, res) => {
    try {
        const validation = validateResourceQuery(req.query);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }

        const {
            search,
            type,
            minCapacity,
            page = "1"
        } = req.query;

        const limit = 10;
        const currentPage = Number(page);
        const skip = (currentPage - 1) * limit;

        const filter = {};

        if (req.user?.role !== "ADMIN") {
            filter.isActive = true;
        }

        if (search) {
            const escapedSearch = search.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.name = {
                $regex: escapedSearch,
                $options: "i"
            };
        }

        if (type) {
            filter.type = type;
        }

        if (minCapacity !== undefined) {
            filter.capacity = {
                $gte: Number(minCapacity)
            };
        }

        const [resources, total] = await Promise.all([
            Resource.find(filter)
                .collation({ locale: "en", strength: 2 })
                .sort({ name: 1, _id: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Resource.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: resources,
            resources,
            total,
            page: currentPage,
            limit,
            totalPages: Math.ceil(total / limit),
            pagination: {
                total,
                page: currentPage,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Get resources error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const getResourceById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const resource = await Resource.findById(id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        if (
            req.user?.role !== "ADMIN" &&
            !resource.isActive
        ) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        return res.status(200).json({
            success: true,
            resource,
            data: resource
        });

    } catch (error) {
        console.error("Get resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const createResource = async (req, res) => {
    try {
        const validation = validateResource(req.body);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }

        const { name, type, capacity, description } = req.body;

        const existingResource = await Resource.findOne({
            name: name.trim()
        }).collation({
            locale: "en",
            strength: 2
        });

        if (existingResource) {
            return res.status(409).json({
                success: false,
                message: "Resource name already exists"
            });
        }

        const resource = await Resource.create({
            name: name.trim(),
            type,
            capacity,
            description: description ? description.trim() : null
        });

        return res.status(201).json({
            success: true,
            message: "Resource created successfully",
            resource,
            data: resource
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Resource name already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Create resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateResource = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const validation = validateResource(req.body, true);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }

        const resource = await Resource.findById(id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const { name, type, capacity, description, isActive } = req.body;

        if (name !== undefined) {
            const existingResource = await Resource.findOne({
                _id: { $ne: id },
                name: name.trim()
            }).collation({
                locale: "en",
                strength: 2
            });

            if (existingResource) {
                return res.status(409).json({
                    success: false,
                    message: "Resource name already exists"
                });
            }

            resource.name = name.trim();
        }

        if (type !== undefined) resource.type = type;
        if (capacity !== undefined) resource.capacity = capacity;

        if (description !== undefined) {
            resource.description = description ? description.trim() : null;
        }

        if (isActive !== undefined) {
            resource.isActive = isActive;
        }

        await resource.save();

        return res.status(200).json({
            success: true,
            message: "Resource updated successfully",
            resource,
            data: resource
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Resource name already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Update resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getResourceAvailability = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const validation = validateAvailabilityQuery(req.query);

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }

        const resource = await Resource.findById(id);

        if (
            !resource ||
            (req.user?.role !== "ADMIN" && !resource.isActive)
        ) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const { from, to } = req.query;

        const start = new Date(from);
        const end = new Date(to);


        const bookings = await Booking.find({
            resourceId: id,

            startTime: { $lt: end },
            endTime: { $gt: start },

            status: {
                $in: ["PENDING", "APPROVED"]
            }
        })
            .select("startTime endTime status")
            .sort({ startTime: 1 });

        return res.status(200).json({
            success: true,
            resourceId: resource._id,
            from,
            to,
            bookings
        });

    } catch (error) {
        console.error("Resource availability error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    getResources,
    getResourceById,
    createResource,
    updateResource,
    getResourceAvailability
};