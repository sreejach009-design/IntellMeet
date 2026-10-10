import api from './api';

export const meetingService = {
  async getMeetings(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/meetings${query ? `?${query}` : ''}`);
    return response.data;
  },

  async createMeeting(meetingData) {
    const response = await api.post('/meetings', meetingData);
    return response.data;
  },

  async getMeetingById(id) {
    const response = await api.get(`/meetings/${id}`);
    return response.data;
  },

  async updateMeeting(id, updates) {
    const response = await api.put(`/meetings/${id}`, updates);
    return response.data;
  },

  async deleteMeeting(id) {
    const response = await api.delete(`/meetings/${id}`);
    return response.data;
  },

  async joinMeeting(id) {
    const response = await api.post(`/meetings/${id}/join`);
    return response.data;
  },

  async endMeeting(id) {
    const response = await api.post(`/meetings/${id}/end`);
    return response.data;
  },

  async getDashboardStats() {
    const response = await api.get('/meetings/stats/dashboard');
    return response.data;
  },
};
