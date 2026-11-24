const Ticket = require("../models/Ticket");
const TicketEvent = require("../models/TicketEvent");
const validateTicket = require("../validators/ticketValidator");
const classifyTicket = require("../services/ticketClassifier");
const mongoose = require("mongoose");




const importTickets = async (req, res) => {
    try {
        const { tickets } = req.body;

        if (!Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body must contain a non-empty 'tickets' array",
            });
        }

        let importedCount = 0;
        let updatedCount = 0;
        let skippedOverrideCount = 0;

        for (const ticketData of tickets) {
            const { externalId, subject, body } = ticketData;

            if (typeof externalId !== "string" || !externalId.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Valid externalId is required",
                });
            }

            const validation = validateTicket({ subject, body });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    externalId,
                    errors: validation.errors,
                });
            }

            const { autoCategory, priority } = classifyTicket(
                subject.trim(),
                body.trim()
            );

            const existing = await Ticket.findOne({ externalId: externalId.trim() });

            if (existing) {

                if (existing.isHumanOverride) {

                    existing.subject = subject.trim();
                    existing.body = body.trim();
                    existing.autoCategory = autoCategory;
                    await existing.save();
                    skippedOverrideCount++;
                } else {

                    existing.subject = subject.trim();
                    existing.body = body.trim();
                    existing.autoCategory = autoCategory;
                    existing.category = autoCategory;
                    existing.priority = priority;
                    await existing.save();
                    updatedCount++;
                }
            } else {
                await Ticket.create({
                    externalId: externalId.trim(),
                    subject: subject.trim(),
                    body: body.trim(),
                    autoCategory,
                    category: autoCategory,
                    priority,
                    status: "OPEN",
                });
                importedCount++;
            }
        }

        const total = importedCount + updatedCount + skippedOverrideCount;

        return res.status(200).json({
            importedCount,
            updatedCount,
            skippedOverrideCount,
            total,
        });
    } catch (error) {
        console.error("Ticket import error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const VALID_CATEGORIES = ["BILLING", "LOGIN", "DELIVERY", "BUG", "FEATURE_REQUEST"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];


const getTickets = async (req, res) => {
    try {
        const { status, category, priority, q, page = 1, limit = 20 } = req.query;

        const filter = {};

        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status filter" });
            }
            filter.status = status;
        }

        if (category) {
            if (!VALID_CATEGORIES.includes(category)) {
                return res.status(400).json({ success: false, message: "Invalid category filter" });
            }
            filter.category = category;
        }

        if (priority) {
            if (!VALID_PRIORITIES.includes(priority)) {
                return res.status(400).json({ success: false, message: "Invalid priority filter" });
            }
            filter.priority = priority;
        }

        if (q && typeof q === "string" && q.trim()) {
            const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [
                { subject: { $regex: escaped, $options: "i" } },
                { body: { $regex: escaped, $options: "i" } },
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [tickets, total] = await Promise.all([
            Ticket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Ticket.countDocuments(filter),
        ]);

        return res.status(200).json({
            tickets,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        console.error("Get tickets error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const ticket = await Ticket.findById(id).lean();

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const events = await TicketEvent.find({ ticketId: id })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ ticket, events });
    } catch (error) {
        console.error("Get ticket by id error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const allowedFields = ["category", "priority", "status", "assigneeId"];
        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields to update",
            });
        }


        if (updates.category && !VALID_CATEGORIES.includes(updates.category)) {
            return res.status(422).json({
                success: false,
                message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
            });
        }

        if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
            return res.status(422).json({
                success: false,
                message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`,
            });
        }

        if (updates.status && !VALID_STATUSES.includes(updates.status)) {
            return res.status(422).json({
                success: false,
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
            });
        }

        if (updates.assigneeId !== undefined) {
            if (
                updates.assigneeId !== null &&
                !mongoose.Types.ObjectId.isValid(updates.assigneeId)
            ) {
                return res.status(422).json({
                    success: false,
                    message: "Invalid assigneeId",
                });
            }
        }

        const actor = req.headers["x-agent"] || req.user?.email || req.user?.name || "unknown";

        const events = [];

        for (const [field, newValue] of Object.entries(updates)) {
            const oldValue = ticket[field] ?? null;
            const newVal = newValue ?? null;

            if (String(oldValue) !== String(newVal)) {
                events.push({
                    ticketId: ticket._id,
                    field,
                    oldValue,
                    newValue: newVal,
                    actor,
                });
            }

            ticket[field] = newVal;
        }

        ticket.isHumanOverride = true;

        await ticket.save();


        if (events.length > 0) {
            await TicketEvent.insertMany(events);
        }


        const allEvents = await TicketEvent.find({ ticketId: ticket._id })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            ticket: ticket.toObject(),
            events: allEvents,
        });
    } catch (error) {
        console.error("Update ticket error:", error);

        if (error.name === "ValidationError") {
            return res.status(422).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = { importTickets, getTickets, getTicketById, updateTicket };
