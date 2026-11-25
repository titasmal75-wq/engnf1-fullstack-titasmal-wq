import api from "../api/axiosInstance";

export const createBooking = async (bookingData) => {
    const response = await api.post("/bookings", bookingData);
    return response.data;
};

export const getMyBookings = async (params = {}) => {
    const response = await api.get("/bookings/my", { params });
    return response.data;
};

export const getAllBookings = async (params = {}) => {
    const response = await api.get("/bookings", { params });
    return response.data;
};

export const getBookingById = async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
};

export const cancelBooking = async (id) => {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data;
};

export const approveBooking = async (id) => {
    const response = await api.patch(`/bookings/${id}/approve`);
    return response.data;
};

export const rejectBooking = async (id, rejectionNote) => {
    const response = await api.patch(`/bookings/${id}/reject`, { rejectionNote });
    return response.data;
};

const bookingRestApi = {
    createBooking,
    getMyBookings,
    getAllBookings,
    getBookingById,
    cancelBooking,
    approveBooking,
    rejectBooking,
};

export default bookingRestApi;
