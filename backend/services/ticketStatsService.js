const Ticket = require("../models/Ticket");

const getTicketStatsData = async () => {

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

    const modelAgreementRate = reviewedCount === 0
        ? 0
        : Number(
            ((agreements / reviewedCount) * 100).toFixed(2)
        );

    return {
        totalTickets,
        byCategory,
        byPriority,
        byStatus,
        reviewedCount,
        modelAgreementRate
    };
};

module.exports = getTicketStatsData;
