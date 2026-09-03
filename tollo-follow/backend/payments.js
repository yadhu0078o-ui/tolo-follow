// payments.js — A self-contained mock payment gateway.
//
// This intentionally does NOT call any real payment processor or move real money.
// It mirrors how Stripe's own TEST MODE works: it only accepts a small set of
// well-known test card numbers, and simulates decline scenarios for others,
// so the checkout flow behaves realistically for a demo without any risk of
// handling real cards or real funds.
'use strict';

// Same test numbers Stripe documents for their own test mode.
const TEST_CARDS = {
  '4242424242424242': { result: 'success' },
  '4000000000000002': { result: 'declined', reason: 'Your card was declined.' },
  '4000000000009995': { result: 'declined', reason: 'Insufficient funds.' },
  '4000000000000069': { result: 'declined', reason: 'Your card has expired.' },
};

function luhnValid(numStr) {
  let sum = 0;
  let alt = false;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let n = parseInt(numStr[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Simulates a card charge in test mode.
 * @returns {{ok: boolean, message: string}}
 */
function processCardPayment({ cardNumber, expiry, cvc }) {
  const digits = (cardNumber || '').replace(/\s+/g, '');

  if (!/^\d{13,19}$/.test(digits)) {
    return { ok: false, message: 'Enter a valid card number.' };
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry || '')) {
    return { ok: false, message: 'Enter the expiry as MM/YY.' };
  }
  if (!/^\d{3,4}$/.test(cvc || '')) {
    return { ok: false, message: 'Enter a valid CVC.' };
  }

  const known = TEST_CARDS[digits];
  if (known) {
    if (known.result === 'success') {
      return { ok: true, message: 'Payment successful (test mode).' };
    }
    return { ok: false, message: `${known.reason} (test mode)` };
  }

  // Unknown number: fall back to a Luhn check so arbitrary "valid-looking" numbers
  // still succeed, matching how a lot of sandbox/demo gateways behave.
  if (!luhnValid(digits)) {
    return { ok: false, message: 'That card number looks invalid.' };
  }
  return { ok: true, message: 'Payment successful (test mode).' };
}

module.exports = { processCardPayment, TEST_CARDS };
