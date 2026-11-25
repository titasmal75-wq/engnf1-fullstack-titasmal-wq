import api from "../api/axiosInstance";

export const importTickets = async (tickets) => {
    const response = await api.post("/tickets/import", { tickets });
    return response.data;
};

export const getTickets = async (params = {}) => {
    const response = await api.get("/tickets", { params });
    return response.data;
};

export const getTicketById = async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
};

export const updateTicket = async (id, updates, agentHeader) => {
    const headers = {};
    if (agentHeader) {
        headers["X-Agent"] = agentHeader;
    }
    const response = await api.patch(`/tickets/${id}`, updates, { headers });
    return response.data;
};

export const getStats = async () => {
    const response = await api.get("/stats");
    return response.data;
};

export const getAdminStats = async () => {
    try {
        const response = await api.get("/admin/stats");
        return response.data;
    } catch {
        const response = await api.get("/stats/admin");
        return response.data;
    }
};

const ticketRestApi = {
    importTickets,
    getTickets,
    getTicketById,
    updateTicket,
    getStats,
    getAdminStats,
};

export default ticketRestApi;

