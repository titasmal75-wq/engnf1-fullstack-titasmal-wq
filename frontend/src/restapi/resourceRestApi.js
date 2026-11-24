import api from "../api/axiosInstance";

export const getResources = async (params = {}) => {
    const response = await api.get("/resources", { params });
    return response.data;
};

export const getResourceById = async (id) => {
    const response = await api.get(`/resources/${id}`);
    return response.data;
};

export const createResource = async (resourceData) => {
    const response = await api.post("/resources", resourceData);
    return response.data;
};

export const updateResource = async (id, resourceData) => {
    const response = await api.patch(`/resources/${id}`, resourceData);
    return response.data;
};

export const getResourceAvailability = async (id, from, to) => {
    const response = await api.get(`/resources/${id}/availability`, {
        params: { from, to }
    });
    return response.data;
};

const resourceRestApi = {
    getResources,
    getResourceById,
    createResource,
    updateResource,
    getResourceAvailability,
};

export default resourceRestApi;
