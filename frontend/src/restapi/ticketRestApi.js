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

const ticketRestApi = {
    importTickets,
    getTickets,
    getTicketById,
    updateTicket,
    getStats,
};

export default ticketRestApi;

