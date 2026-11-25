const Ticket = require("../models/Ticket");
const Resource = require("../models/Resource");
const Booking = require("../models/Booking");
const getTicketStatsData = require("../services/ticketStatsService");

const getTicketStats = async (req, res) => {
    try {
        const [
            byCategory,
            byPriority,
            byStatus,
            reviewedCount,
            agreementData,
            totalTickets
        ] = await Promise.all([

            Ticket.aggregate([
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 }
                    }
                }
            ]),

            Ticket.aggregate([
                {
                    $group: {
                        _id: "$priority",
                        count: { $sum: 1 }
                    }
                }
            ]),

            Ticket.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]),

            Ticket.countDocuments({
                isReviewed: true
            }),

            Ticket.aggregate([
                {
                    $match: {
                        isReviewed: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalReviewed: { $sum: 1 },
                        agreements: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$autoCategory",
                                            "$category"
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),

            Ticket.countDocuments()
        ]);

        const agreements = agreementData[0]?.agreements || 0;

        const modelAgreementRate =
            reviewedCount === 0
                ? 0
                : Number(
                    ((agreements / reviewedCount) * 100).toFixed(2)
                );

        return res.status(200).json({
            success: true,
            totalTickets,
            byCategory,
            byPriority,
            byStatus,
            reviewedCount,
            modelAgreementRate
        });

    } catch (error) {
        console.error("Stats error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getAdminStats = async (req, res) => {
    try {
        const [
            activeResources,
            bookingData,
            topResources,
            ticketData
        ] = await Promise.all([

            Resource.countDocuments({
                isActive: true
            }),

            Booking.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]),

            Booking.aggregate([
                {
                    $group: {
                        _id: "$resourceId",
                        bookingCount: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        bookingCount: -1,
                        _id: 1
                    }
                },
                {
                    $limit: 3
                },
                {
                    $lookup: {
                        from: "resources",
                        localField: "_id",
                        foreignField: "_id",
                        as: "resource"
                    }
                },
                {
                    $unwind: "$resource"
                },
                {
                    $project: {
                        _id: 0,
                        resourceId: "$_id",
                        name: "$resource.name",
                        bookingCount: 1
                    }
                }
            ]),

            getTicketStatsData()
        ]);

        const bookingsByStatus = {
            PENDING: 0,
            APPROVED: 0,
            REJECTED: 0,
            CANCELLED: 0
        };

        bookingData.forEach(item => {
            if (Object.hasOwn(bookingsByStatus, item._id)) {
                bookingsByStatus[item._id] = item.count;
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                activeResources,
                bookingsByStatus,
                topResources,
                ticketStats: ticketData
            }
        });

    } catch (error) {
        console.error("Admin stats error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch admin statistics"
        });
    }
};

module.exports = { getTicketStats, getAdminStats };
