import axios from 'axios';

// Create axios instance with the correct backend URL
const api = axios.create({
    baseURL: 'http://localhost:8000'
});

export const SectionService = {
    async getSections() {
        const response = await api.get('/api/sections');
        return response.data;
    },

    async createSection(sectionData) {
        const response = await api.post('/api/sections', sectionData);
        return response.data;
    },

    async updateSection(id, sectionData) {
        const response = await api.put(`/api/sections/${id}`, sectionData);
        return response.data;
    },

    async deleteSection(id) {
        const response = await api.delete(`/api/sections/${id}`);
        return response.data;
    }
};
