// db.js — Data layer for Tollo Follow
// Uses Node's built-in `node:sqlite` module (no external dependencies required).
'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'tollo.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    package_followers INTEGER NOT NULL,
    price_inr INTEGER NOT NULL,
    instagram_handle TEXT NOT NULL,
    payment_method TEXT NOT NULL,           -- 'card' | 'upi'
    payment_status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid | pending_verification | paid | failed
    fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_payment',
      -- awaiting_payment | queued | processing | completed
    progress INTEGER NOT NULL DEFAULT 0,     -- 0-100
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

// ---------- Users ----------

function createUser({ name, email, passwordHash, salt, role = 'customer' }) {
  const stmt = db.prepare(
    `INSERT INTO users (name, email, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(name, email.toLowerCase(), passwordHash, salt, role);
  return getUserById(info.lastInsertRowid);
}

function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase());
}

function getUserById(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

// ---------- Orders ----------

function createOrder({ userId, packageFollowers, priceInr, instagramHandle, paymentMethod }) {
  const stmt = db.prepare(`
    INSERT INTO orders (user_id, package_followers, price_inr, instagram_handle, payment_method)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(userId, packageFollowers, priceInr, instagramHandle, paymentMethod);
  addOrderEvent(info.lastInsertRowid, 'Order created. Awaiting payment.');
  return getOrderById(info.lastInsertRowid);
}

function getOrderById(id) {
  return db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);
}

function getOrdersForUser(userId) {
  return db.prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
}

function getAllOrders() {
  return db.prepare(`
    SELECT orders.*, users.name AS customer_name, users.email AS customer_email
    FROM orders
    JOIN users ON users.id = orders.user_id
    ORDER BY orders.created_at DESC
  `).all();
}

function updateOrder(id, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return getOrderById(id);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k]);
  db.prepare(`UPDATE orders SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .run(...values, id);
  return getOrderById(id);
}

function addOrderEvent(orderId, message) {
  db.prepare(`INSERT INTO order_events (order_id, message) VALUES (?, ?)`).run(orderId, message);
}

function getOrderEvents(orderId) {
  return db.prepare(`SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC`).all(orderId);
}

function getStats() {
  const totalRevenue = db.prepare(
    `SELECT COALESCE(SUM(price_inr), 0) AS total FROM orders WHERE payment_status = 'paid'`
  ).get().total;
  const totalOrders = db.prepare(`SELECT COUNT(*) AS c FROM orders`).get().c;
  const pendingVerification = db.prepare(
    `SELECT COUNT(*) AS c FROM orders WHERE payment_status = 'pending_verification'`
  ).get().c;
  const totalUsers = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'customer'`).get().c;
  const totalFollowersSold = db.prepare(
    `SELECT COALESCE(SUM(package_followers), 0) AS c FROM orders WHERE payment_status = 'paid'`
  ).get().c;
  return { totalRevenue, totalOrders, pendingVerification, totalUsers, totalFollowersSold };
}

module.exports = {
  db,
  createUser,
  getUserByEmail,
  getUserById,
  createOrder,
  getOrderById,
  getOrdersForUser,
  getAllOrders,
  updateOrder,
  addOrderEvent,
  getOrderEvents,
  getStats,
};
