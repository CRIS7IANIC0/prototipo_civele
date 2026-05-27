import api from './api';

export const inventoryService = {
  getAll: (params) => api.get('/inventory', { params }),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  remove: (id) => api.delete(`/inventory/${id}`),
  addMovement: (id, data) => api.post(`/inventory/${id}/movement`, data),
  getMovements: (id) => api.get(`/inventory/${id}/movements`),
  getCategories: () => api.get('/inventory/meta/categories'),
  getAlerts: () => api.get('/inventory/meta/alerts'),
  analyze: () => api.post('/inventory/meta/analyze'),
};
