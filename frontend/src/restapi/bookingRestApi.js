import api from "../api/axiosInstance";

export const createBooking = async (bookingData) => {
    const response = await api.post("/bookings", bookingData);
    return response.data;
};

export const getMyBookings = async (params = {}) => {
    const response = await api.get("/bookings/my", { params });
    return response.data;
};

export const cancelBooking = async (id) => {
    const response = await api.patch(`/bookings/${id}/cancel`);
    return response.data;
};

const bookingRestApi = {
    createBooking,
    getMyBookings,
    cancelBooking,
};

export default bookingRestApi;
