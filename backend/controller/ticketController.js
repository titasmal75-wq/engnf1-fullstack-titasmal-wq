const Ticket = require("../models/Ticket");
const TicketEvent = require("../models/TicketEvent");
const validateTicket = require("../validators/ticketValidator");
const classifyTicket = require("../services/ticketClassifier");
const mongoose = require("mongoose");

const VALID_CATEGORIES = [
    "BILLING",
    "LOGIN",
    "DELIVERY",
    "BUG",
    "FEATURE_REQUEST"
];

const VALID_PRIORITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT"
];

const VALID_STATUSES = [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED"
];

const importTickets = async (req, res) => {
    try {
        const tickets = Array.isArray(req.body) ? req.body : req.body?.tickets;

        if (!Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body must contain a non-empty tickets array"
            });
        }

        let importedCount = 0;
        let updatedCount = 0;
        let skippedOverrideCount = 0;

        for (const ticketData of tickets) {
            const { externalId, subject, body } = ticketData;

            if (
                typeof externalId !== "string" ||
                !externalId.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid externalId is required"
                });
            }

            const validation = validateTicket({
                subject,
                body
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    externalId,
                    errors: validation.errors
                });
            }

            const { autoCategory, priority } = classifyTicket(
                subject.trim(),
                body.trim()
            );

            const existing = await Ticket.findOne({
                externalId: externalId.trim()
            });

            if (existing) {

                existing.subject = subject.trim();
                existing.body = body.trim();

                if (existing.isHumanOverride) {
                    skippedOverrideCount++;
                } else {
                    existing.autoCategory = autoCategory;
                    existing.category = autoCategory;
                    existing.priority = priority;

                    updatedCount++;
                }

                await existing.save();

            } else {
                await Ticket.create({
                    externalId: externalId.trim(),
                    subject: subject.trim(),
                    body: body.trim(),

                    autoCategory,
                    category: autoCategory,
                    priority,

                    status: "OPEN",

                    isReviewed: false,
                    isHumanOverride: false
                });

                importedCount++;
            }
        }

        return res.status(200).json({
            success: true,
            importedCount,
            updatedCount,
            skippedOverrideCount,
            total: importedCount + updatedCount + skippedOverrideCount
        });

    } catch (error) {
        console.error("Ticket import error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const getTickets = async (req, res) => {
    try {
        const {
            status,
            category,
            priority,
            q,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};

        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status filter"
                });
            }

            filter.status = status;
        }

        if (category) {
            if (!VALID_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category filter"
                });
            }

            filter.category = category;
        }

        if (priority) {
            if (!VALID_PRIORITIES.includes(priority)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid priority filter"
                });
            }

            filter.priority = priority;
        }

        if (q && typeof q === "string" && q.trim()) {
            const escaped = q.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.$or = [
                { subject: { $regex: escaped, $options: "i" } },
                { body: { $regex: escaped, $options: "i" } }
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(
            100,
            Math.max(1, parseInt(limit, 10) || 20)
        );

        const skip = (pageNum - 1) * limitNum;

        const [tickets, total] = await Promise.all([
            Ticket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),

            Ticket.countDocuments(filter)
        ]);

        return res.status(200).json({
            data: tickets,
            tickets,
            total,
            page: pageNum,
            pageSize: limitNum,
            totalPages: Math.ceil(total / limitNum)
        });

    } catch (error) {
        console.error("Get tickets error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};



const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const ticket = await Ticket.findById(id).lean();

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const events = await TicketEvent.find({
            ticketId: id
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            ticket,
            events
        });

    } catch (error) {
        console.error("Get ticket by id error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const allowedFields = [
            "category",
            "priority",
            "status",
            "assigneeId"
        ];

        const validValues = {
            category: VALID_CATEGORIES,
            priority: VALID_PRIORITIES,
            status: VALID_STATUSES
        };

        const changes = [];

        for (const field of allowedFields) {
            if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
                continue;
            }

            const newValue = req.body[field];

            // assigneeId: allow null or a non-empty string (ObjectId)
            if (field === "assigneeId") {
                if (newValue !== null && (typeof newValue !== "string" || !newValue.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid assigneeId"
                    });
                }
            } else {
                if (
                    typeof newValue !== "string" ||
                    !validValues[field].includes(newValue)
                ) {
                    return res.status(422).json({
                        success: false,
                        message: `Invalid value for ${field}`
                    });
                }
            }

            const oldValue = ticket[field];
            const normalizedOld = oldValue?.toString() ?? null;
            const normalizedNew = newValue?.toString() ?? null;

            if (normalizedOld !== normalizedNew) {
                changes.push({
                    field,
                    oldValue: normalizedOld,
                    newValue: normalizedNew
                });
            }
        }

        // Read X-Agent header; fall back to authenticated user identity
        const agentHeader = req.headers["x-agent"];
        const actor =
            agentHeader ||
            req.user?.email ||
            req.user?.id?.toString() ||
            req.user?._id?.toString();

        if (!actor) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found"
            });
        }

        if (changes.length === 0) {
            // Return full events even when nothing changed
            const existingEvents = await TicketEvent.find({ ticketId: id })
                .sort({ createdAt: -1 })
                .lean();
            return res.status(200).json({
                success: true,
                message: "No changes detected",
                ticket,
                events: existingEvents
            });
        }

        const oldStatus = ticket.status;

        changes.forEach(change => {
            ticket[change.field] = change.newValue;
        });

        const categoryChanged = changes.some(change => change.field === "category");
        if (categoryChanged) {
            ticket.isHumanOverride = true;
        }
        const statusChangedFromOpen =
            oldStatus === "OPEN" &&
            ticket.status !== "OPEN";

        if (categoryChanged || statusChangedFromOpen) {
            ticket.isReviewed = true;
        }


        const session = await mongoose.startSession();

        let updatedTicket;
        let allEvents = [];

        try {
            await session.withTransaction(async () => {
                await ticket.save({ session });

                const eventData = changes.map(change => ({
                    ticketId: ticket._id,
                    field: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    actor
                }));

                await TicketEvent.insertMany(eventData, { session });

                updatedTicket = ticket;
            });
        } finally {
            await session.endSession();
        }

        // Fetch full audit history after save
        allEvents = await TicketEvent.find({ ticketId: id })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Ticket reviewed successfully",
            ticket: updatedTicket,
            events: allEvents
        });

    } catch (error) {
        console.error("Update ticket error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTicketEvents = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const ticketExists = await Ticket.exists({
            _id: id
        });

        if (!ticketExists) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const events = await TicketEvent.find({
            ticketId: id
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: events.length,
            events
        });

    } catch (error) {
        console.error("Get ticket events error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};



module.exports = {
    importTickets,
    getTickets,
    getTicketById,
    updateTicket,
    getTicketEvents
};
