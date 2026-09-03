// server.js — Tollo Follow backend.
// Pure Node.js: no Express, no npm install required. Run with: node server.js
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const db = require('./db');
const authLib = require('./auth');
const payments = require('./payments');

const PORT = process.env.PORT || 4000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');

const PACKAGES = [
  { followers: 100, priceInr: 50 },
  { followers: 200, priceInr: 100 },
  { followers: 300, priceInr: 125 },
  { followers: 500, priceInr: 230 },
  { followers: 1000, priceInr: 500 },
];

// ---------- Seed an admin account so judges can log into /admin immediately ----------
(function seedAdmin() {
  const existing = db.getUserByEmail('admin@tollofollow.com');
  if (!existing) {
    const { hash, salt } = authLib.hashPassword('admin123');
    db.createUser({
      name: 'Tollo Admin',
      email: 'admin@tollofollow.com',
      passwordHash: hash,
      salt,
      role: 'admin',
    });
    console.log('Seeded admin account: admin@tollofollow.com / admin123');
  }
})();

// ---------- Fulfillment simulation ----------
// Every few seconds, nudge along any paid order that hasn't finished "delivering" yet.
setInterval(() => {
  const rows = db.db
    .prepare(
      `SELECT * FROM orders WHERE payment_status = 'paid' AND fulfillment_status != 'completed'`
    )
    .all();
  for (const order of rows) {
    const bump = 8 + Math.floor(Math.random() * 15); // 8-22%
    const nextProgress = Math.min(100, order.progress + bump);
    const nextStatus = nextProgress >= 100 ? 'completed' : 'processing';
    db.updateOrder(order.id, { progress: nextProgress, fulfillment_status: nextStatus });
    if (nextStatus === 'processing' && order.fulfillment_status === 'queued') {
      db.addOrderEvent(order.id, 'Delivery started — followers are trickling in.');
    }
    if (nextStatus === 'completed') {
      db.addOrderEvent(order.id, `All ${order.package_followers} followers delivered.`);
    }
  }
}, 4000);

// ---------- Small helpers ----------

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (c) => {
      chunks += c;
      if (chunks.length > 1e6) req.destroy(); // 1MB cap
    });
    req.on('end', () => {
      if (!chunks) return resolve({});
      try {
        resolve(JSON.parse(chunks));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = authLib.verify(token);
  if (!payload) return null;
  const user = db.getUserById(payload.userId);
  return user || null;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function publicOrder(order) {
  return {
    id: order.id,
    packageFollowers: order.package_followers,
    priceInr: order.price_inr,
    instagramHandle: order.instagram_handle,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    progress: order.progress,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // SPA fallback: unknown non-API routes get index.html so client-side routing works.
      fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (err2, indexContent) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(indexContent);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- Route handlers ----------

async function handleRegister(req, res) {
  const body = await readBody(req);
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!name || !email || !password) {
    return sendJson(res, 400, { error: 'Name, email and password are all required.' });
  }
  if (password.length < 6) {
    return sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
  }
  if (db.getUserByEmail(email)) {
    return sendJson(res, 409, { error: 'An account with that email already exists.' });
  }

  const { hash, salt } = authLib.hashPassword(password);
  const user = db.createUser({ name, email, passwordHash: hash, salt });
  const token = authLib.sign({ userId: user.id });
  sendJson(res, 201, { token, user: publicUser(user) });
}

async function handleLogin(req, res) {
  const body = await readBody(req);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  const user = db.getUserByEmail(email);
  if (!user || !authLib.verifyPassword(password, user.password_hash, user.salt)) {
    return sendJson(res, 401, { error: 'Incorrect email or password.' });
  }
  const token = authLib.sign({ userId: user.id });
  sendJson(res, 200, { token, user: publicUser(user) });
}

function handleMe(req, res, user) {
  sendJson(res, 200, { user: publicUser(user) });
}

function handlePackages(req, res) {
  sendJson(res, 200, { packages: PACKAGES });
}

async function handleCreateOrder(req, res, user) {
  const body = await readBody(req);
  const { packageFollowers, instagramHandle, paymentMethod } = body;

  const pkg = PACKAGES.find((p) => p.followers === Number(packageFollowers));
  if (!pkg) return sendJson(res, 400, { error: 'Invalid package selected.' });
  if (!instagramHandle || !instagramHandle.trim()) {
    return sendJson(res, 400, { error: 'Instagram handle is required.' });
  }
  if (!['card', 'upi'].includes(paymentMethod)) {
    return sendJson(res, 400, { error: 'Invalid payment method.' });
  }

  const order = db.createOrder({
    userId: user.id,
    packageFollowers: pkg.followers,
    priceInr: pkg.priceInr,
    instagramHandle: instagramHandle.trim().replace(/^@/, ''),
    paymentMethod,
  });
  sendJson(res, 201, { order: publicOrder(order) });
}

async function handlePayCard(req, res, user, orderId) {
  const order = db.getOrderById(orderId);
  if (!order || order.user_id !== user.id) return sendJson(res, 404, { error: 'Order not found.' });
  if (order.payment_status === 'paid') return sendJson(res, 400, { error: 'Order already paid.' });

  const body = await readBody(req);
  const result = payments.processCardPayment(body);

  if (!result.ok) {
    db.addOrderEvent(order.id, `Card payment attempt failed: ${result.message}`);
    return sendJson(res, 402, { error: result.message });
  }

  const updated = db.updateOrder(order.id, {
    payment_status: 'paid',
    fulfillment_status: 'queued',
  });
  db.addOrderEvent(order.id, 'Payment confirmed via card (test mode). Order queued for delivery.');
  sendJson(res, 200, { order: publicOrder(updated) });
}

async function handlePayUpiConfirm(req, res, user, orderId) {
  const order = db.getOrderById(orderId);
  if (!order || order.user_id !== user.id) return sendJson(res, 404, { error: 'Order not found.' });
  if (order.payment_status === 'paid') return sendJson(res, 400, { error: 'Order already paid.' });

  const updated = db.updateOrder(order.id, { payment_status: 'pending_verification' });
  db.addOrderEvent(
    order.id,
    'Buyer marked this order as paid via UPI. Waiting for manual verification.'
  );
  sendJson(res, 200, { order: publicOrder(updated) });
}

function handleMyOrders(req, res, user) {
  const orders = db.getOrdersForUser(user.id).map(publicOrder);
  sendJson(res, 200, { orders });
}

function handleOrderDetail(req, res, user, orderId) {
  const order = db.getOrderById(orderId);
  if (!order) return sendJson(res, 404, { error: 'Order not found.' });
  if (order.user_id !== user.id && user.role !== 'admin') {
    return sendJson(res, 403, { error: 'Not your order.' });
  }
  const events = db.getOrderEvents(orderId);
  sendJson(res, 200, { order: publicOrder(order), events });
}

// ---- Admin ----

function requireAdmin(user, res) {
  if (!user || user.role !== 'admin') {
    sendJson(res, 403, { error: 'Admin access required.' });
    return false;
  }
  return true;
}

function handleAdminOrders(req, res, user) {
  if (!requireAdmin(user, res)) return;
  const orders = db.getAllOrders().map(publicOrder);
  sendJson(res, 200, { orders });
}

function handleAdminStats(req, res, user) {
  if (!requireAdmin(user, res)) return;
  sendJson(res, 200, { stats: db.getStats() });
}

function handleAdminVerify(req, res, user, orderId) {
  if (!requireAdmin(user, res)) return;
  const order = db.getOrderById(orderId);
  if (!order) return sendJson(res, 404, { error: 'Order not found.' });
  const updated = db.updateOrder(order.id, {
    payment_status: 'paid',
    fulfillment_status: 'queued',
  });
  db.addOrderEvent(order.id, 'Admin verified UPI payment. Order queued for delivery.');
  sendJson(res, 200, { order: publicOrder(updated) });
}

function handleAdminReject(req, res, user, orderId) {
  if (!requireAdmin(user, res)) return;
  const order = db.getOrderById(orderId);
  if (!order) return sendJson(res, 404, { error: 'Order not found.' });
  const updated = db.updateOrder(order.id, { payment_status: 'failed' });
  db.addOrderEvent(order.id, 'Admin rejected this payment.');
  sendJson(res, 200, { order: publicOrder(updated) });
}

// ---------- Router ----------

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  if (!pathname.startsWith('/api/')) {
    return serveStatic(req, res, pathname);
  }

  try {
    // Public routes
    if (pathname === '/api/auth/register' && method === 'POST') return await handleRegister(req, res);
    if (pathname === '/api/auth/login' && method === 'POST') return await handleLogin(req, res);
    if (pathname === '/api/packages' && method === 'GET') return handlePackages(req, res);

    // Authenticated routes
    const user = getAuthUser(req);
    const orderIdMatch = pathname.match(/^\/api\/orders\/(\d+)(?:\/(pay\/card|pay\/upi-confirm))?$/);
    const adminOrderIdMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/(verify|reject)$/);

    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!user) return sendJson(res, 401, { error: 'Not authenticated.' });
      return handleMe(req, res, user);
    }
    if (pathname === '/api/orders' && method === 'POST') {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      return await handleCreateOrder(req, res, user);
    }
    if (pathname === '/api/orders/mine' && method === 'GET') {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      return handleMyOrders(req, res, user);
    }
    if (orderIdMatch && method === 'GET' && !orderIdMatch[2]) {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      return handleOrderDetail(req, res, user, Number(orderIdMatch[1]));
    }
    if (orderIdMatch && method === 'POST' && orderIdMatch[2] === 'pay/card') {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      return await handlePayCard(req, res, user, Number(orderIdMatch[1]));
    }
    if (orderIdMatch && method === 'POST' && orderIdMatch[2] === 'pay/upi-confirm') {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      return await handlePayUpiConfirm(req, res, user, Number(orderIdMatch[1]));
    }
    if (pathname === '/api/admin/orders' && method === 'GET') {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      return handleAdminOrders(req, res, user);
    }
    if (pathname === '/api/admin/stats' && method === 'GET') {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      return handleAdminStats(req, res, user);
    }
    if (adminOrderIdMatch && method === 'POST') {
      if (!user) return sendJson(res, 401, { error: 'Please log in first.' });
      const [, id, action] = adminOrderIdMatch;
      if (action === 'verify') return handleAdminVerify(req, res, user, Number(id));
      if (action === 'reject') return handleAdminReject(req, res, user, Number(id));
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Something went wrong on our end.' });
  }
});

server.listen(PORT, () => {
  console.log(`Tollo Follow backend running on http://localhost:${PORT}`);
});
