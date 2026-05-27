import api from './api';

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
};

export const supplierService = {
  getAllSuppliers: () => api.get('/suppliers/all'),
  getMySuppliers: () => api.get('/suppliers/my-suppliers'),
  getMyClients: () => api.get('/suppliers/my-clients'),
  link: (supplier_id) => api.post('/suppliers/link', { supplier_id }),
  unlink: (id) => api.delete(`/suppliers/${id}/unlink`),
};
