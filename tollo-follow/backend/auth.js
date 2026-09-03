// auth.js — Password hashing + signed session tokens, using only Node's built-in `crypto`.
// No JWT library required: this implements the same signed-payload idea by hand.
'use strict';

const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'tollo-follow-dev-secret-change-in-production';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// ---------- Passwords ----------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(attempt, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------- Tokens (HMAC-signed, base64url payload — functionally a hand-rolled JWT) ----------

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadObj) {
  const payload = { ...payloadObj, exp: Date.now() + TOKEN_TTL_MS };
  const payloadStr = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadStr, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url');
  const sigBuf = Buffer.from(signature || '', 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, sign, verify };
