import api from './api';

export const workspaceService = {
  async getWorkspaces() {
    const response = await api.get('/workspaces');
    return response.data;
  },

  async createWorkspace(workspaceData) {
    const response = await api.post('/workspaces', workspaceData);
    return response.data;
  },

  async getWorkspaceById(id) {
    const response = await api.get(`/workspaces/${id}`);
    return response.data;
  },

  async addMember(workspaceId, memberData) {
    const response = await api.post(`/workspaces/${workspaceId}/members`, memberData);
    return response.data;
  },
};
