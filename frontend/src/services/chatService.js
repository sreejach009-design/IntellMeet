import api from './api';

export const chatService = {
  async getMeetingMessages(meetingId) {
    const response = await api.get(`/chat/${meetingId}`);
    return response.data;
  },

  async sendMeetingMessage(meetingId, data) {
    const response = await api.post(`/chat/${meetingId}`, data);
    return response.data;
  },
};
