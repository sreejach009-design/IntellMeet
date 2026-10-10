import api from './api';

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('intellmeet_token', response.data.token);
      localStorage.setItem('intellmeet_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('intellmeet_token', response.data.token);
      localStorage.setItem('intellmeet_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('intellmeet_token');
    localStorage.removeItem('intellmeet_user');
  },

  getStoredUser() {
    const userStr = localStorage.getItem('intellmeet_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('intellmeet_token');
  },

  async updateProfile(profileData) {
    const response = await api.put('/users/profile', profileData);
    if (response.data.user) {
      localStorage.setItem('intellmeet_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async changePassword(passwordData) {
    const response = await api.put('/users/change-password', passwordData);
    return response.data;
  },

  async searchUsers(query) {
    const response = await api.get(`/users/search?q=${encodeURIComponent(query || '')}`);
    return response.data;
  },
};
