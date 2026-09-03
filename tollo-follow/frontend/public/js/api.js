// api.js — thin fetch wrapper for the Tollo Follow backend.

const TOKEN_KEY = 'tollo_token';
const USER_KEY = 'tollo_user';

const Api = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const err = new Error(data.error || 'Something went wrong.');
      err.status = res.status;
      throw err;
    }
    return data;
  },

  register(name, email, password) {
    return this.request('/auth/register', { method: 'POST', body: { name, email, password } });
  },
  login(email, password) {
    return this.request('/auth/login', { method: 'POST', body: { email, password } });
  },
  me() {
    return this.request('/auth/me');
  },
  packages() {
    return this.request('/packages');
  },
  createOrder(packageFollowers, instagramHandle, paymentMethod) {
    return this.request('/orders', {
      method: 'POST',
      body: { packageFollowers, instagramHandle, paymentMethod },
    });
  },
  myOrders() {
    return this.request('/orders/mine');
  },
  orderDetail(id) {
    return this.request(`/orders/${id}`);
  },
  payCard(id, card) {
    return this.request(`/orders/${id}/pay/card`, { method: 'POST', body: card });
  },
  payUpiConfirm(id) {
    return this.request(`/orders/${id}/pay/upi-confirm`, { method: 'POST' });
  },
  adminOrders() {
    return this.request('/admin/orders');
  },
  adminStats() {
    return this.request('/admin/stats');
  },
  adminVerify(id) {
    return this.request(`/admin/orders/${id}/verify`, { method: 'POST' });
  },
  adminReject(id) {
    return this.request(`/admin/orders/${id}/reject`, { method: 'POST' });
  },
};
