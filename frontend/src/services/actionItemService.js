import api from './api';

export const actionItemService = {
  async getActionItems(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/action-items${query ? `?${query}` : ''}`);
    return response.data;
  },

  async createActionItem(itemData) {
    const response = await api.post('/action-items', itemData);
    return response.data;
  },

  async updateStatus(id, status) {
    const response = await api.patch(`/action-items/${id}/status`, { status });
    return response.data;
  },

  async deleteActionItem(id) {
    const response = await api.delete(`/action-items/${id}`);
    return response.data;
  },
};
