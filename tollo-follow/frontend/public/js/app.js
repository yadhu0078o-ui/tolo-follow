// app.js — Tollo Follow single-page app (no framework, no build step).

const app = document.getElementById('app');

const PACKAGES_FALLBACK = [
  { followers: 100, priceInr: 50 },
  { followers: 200, priceInr: 100 },
  { followers: 300, priceInr: 125 },
  { followers: 500, priceInr: 230 },
  { followers: 1000, priceInr: 500 },
];

function fmtInr(n) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(iso) {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(order) {
  if (order.paymentStatus === 'failed') return `<span class="badge badge-failed">Payment failed</span>`;
  if (order.paymentStatus === 'pending_verification') return `<span class="badge badge-pending">Verifying payment</span>`;
  if (order.paymentStatus === 'unpaid') return `<span class="badge badge-unpaid">Awaiting payment</span>`;
  if (order.fulfillmentStatus === 'completed') return `<span class="badge badge-completed">Delivered</span>`;
  return `<span class="badge badge-paid">In progress</span>`;
}

function navBar() {
  const user = Api.getUser();
  return `
    <nav class="nav">
      <div class="nav-inner">
        <div class="brand" data-nav="/">
          <span class="brand-mark"></span> Tollo Follow
        </div>
        <div class="nav-links">
          <span class="nav-link" data-nav="/#pricing">Pricing</span>
          <span class="nav-link" data-nav="/#how">How it works</span>
          ${user ? `<span class="nav-link" data-nav="/dashboard">My orders</span>` : ''}
          ${user && user.role === 'admin' ? `<span class="nav-link" data-nav="/admin">Admin</span>` : ''}
        </div>
        <div class="nav-cta">
          ${
            user
              ? `<span class="nav-link" data-action="logout">Log out</span>`
              : `<span class="nav-link" data-nav="/login">Log in</span><button class="btn btn-primary" data-nav="/signup">Get started</button>`
          }
        </div>
      </div>
    </nav>
  `;
}

// ---------------- Views ----------------

function landingView(packages) {
  const rows = packages
    .map(
      (p, i) => `
      <div class="price-card ${i === 3 ? 'featured' : ''}">
        <div class="followers">${p.followers.toLocaleString('en-IN')}</div>
        <div class="followers-label">followers</div>
        <div class="price">${fmtInr(p.priceInr)}</div>
        <button class="btn btn-ghost btn-block" data-nav="/checkout/${p.followers}">Choose</button>
      </div>`
    )
    .join('');

  return `
    ${navBar()}
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <h1>Grow your Instagram<br/><em>without waiting months</em></h1>
          <p class="lede">Tollo Follow delivers real-looking follower growth to your profile in hours, not quarters — with order tracking and support the whole way through.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-nav="/#pricing">See packages</button>
            <button class="btn btn-ghost" data-nav="/signup">Create an account</button>
          </div>
          <div class="hero-trust">
            <div><strong>12,400+</strong>orders delivered</div>
            <div><strong>4.8/5</strong>average rating</div>
            <div><strong>24-48h</strong>typical delivery</div>
          </div>
        </div>
        <div class="phone">
          <div class="phone-screen">
            <div class="phone-profile">
              <div class="phone-avatar"></div>
              <div>
                <div class="phone-name">yourbrand</div>
                <div class="phone-handle">@yourbrand</div>
              </div>
            </div>
            <div class="phone-stats">
              <div class="phone-stat"><div class="num">184</div><div class="label">Posts</div></div>
              <div class="phone-stat highlight"><div class="num" id="counter">2,340</div><div class="label">Followers</div></div>
              <div class="phone-stat"><div class="num">312</div><div class="label">Following</div></div>
            </div>
            <div class="phone-ticker">+18 followers in the last hour</div>
          </div>
        </div>
      </div>
    </section>

    <hr class="divider" />

    <section id="pricing">
      <div class="container">
        <div class="section-head">
          <h2>Pick a package</h2>
          <p>Straightforward one-time pricing. No subscriptions, no hidden fees.</p>
        </div>
        <div class="pricing-row">${rows}</div>
      </div>
    </section>

    <section id="how">
      <div class="container">
        <div class="section-head">
          <h2>How it works</h2>
          <p>Three steps between you and a heavier follower count.</p>
        </div>
        <div class="steps">
          <div class="step">
            <div class="step-index">01</div>
            <h3>Choose your package</h3>
            <p>Pick how many followers you want and tell us the Instagram handle to deliver to.</p>
          </div>
          <div class="step">
            <div class="step-index">02</div>
            <h3>Pay by card or UPI</h3>
            <p>Checkout takes under a minute. UPI orders are confirmed once we verify your payment.</p>
          </div>
          <div class="step">
            <div class="step-index">03</div>
            <h3>Watch it arrive</h3>
            <p>Track delivery progress live from your dashboard until the order is complete.</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container footer-grid">
        <div>© ${new Date().getFullYear()} Tollo Follow. Built for demonstration purposes.</div>
        <div>Hackathon build — test payments only, no real charges.</div>
      </div>
    </footer>
  `;
}

function authView(mode) {
  const isLogin = mode === 'login';
  return `
    ${navBar()}
    <div class="auth-shell">
      <div class="card auth-card">
        <h2>${isLogin ? 'Welcome back' : 'Create your account'}</h2>
        <p class="sub">${isLogin ? 'Log in to track your orders.' : 'Takes less than a minute.'}</p>
        <div id="form-msg"></div>
        <form id="auth-form">
          ${!isLogin ? `
          <div class="field">
            <label for="name">Full name</label>
            <input id="name" name="name" type="text" required placeholder="Priya Sharma" />
          </div>` : ''}
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@email.com" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" required minlength="6" placeholder="••••••••" />
          </div>
          <button class="btn btn-primary btn-block" type="submit">${isLogin ? 'Log in' : 'Create account'}</button>
        </form>
        <div class="auth-switch">
          ${isLogin
            ? `New here? <a data-nav="/signup">Create an account</a>`
            : `Already have an account? <a data-nav="/login">Log in</a>`}
        </div>
        ${isLogin ? `<div class="field hint" style="margin-top:18px;text-align:center">Admin demo login: admin@tollofollow.com / admin123</div>` : ''}
      </div>
    </div>
  `;
}

function checkoutView(followers, packages) {
  const pkg = packages.find((p) => p.followers === followers) || packages[0];
  return `
    ${navBar()}
    <div class="app-shell">
      <div class="app-head">
        <div>
          <h1>Checkout</h1>
          <p>You're one step from ${pkg.followers.toLocaleString('en-IN')} new followers.</p>
        </div>
      </div>
      <div id="checkout-body"></div>
    </div>
  `;
}

function dashboardView() {
  return `
    ${navBar()}
    <div class="app-shell">
      <div class="app-head">
        <div>
          <h1>Your orders</h1>
          <p>Track delivery progress for everything you've bought.</p>
        </div>
        <button class="btn btn-primary" data-nav="/#pricing" data-nav-home-pricing="1">Buy more followers</button>
      </div>
      <div id="orders-body"><div class="empty-state"><span class="spinner"></span></div></div>
    </div>
  `;
}

function adminView() {
  return `
    ${navBar()}
    <div class="app-shell">
      <div class="app-head">
        <div>
          <h1>Admin panel</h1>
          <p>Every order, live payment verification, and delivery status.</p>
        </div>
      </div>
      <div id="stats-body" class="stat-row"></div>
      <div id="admin-body"><div class="empty-state"><span class="spinner"></span></div></div>
    </div>
  `;
}

// ---------------- Router ----------------

let cachedPackages = PACKAGES_FALLBACK;
let fulfillmentPoller = null;

async function router() {
  clearInterval(fulfillmentPoller);
  const hash = window.location.hash.replace('#', '') || '/';
  const [pathPart] = hash.split('?');

  if (pathPart === '/' || pathPart.startsWith('/#')) {
    app.innerHTML = landingView(cachedPackages);
    animateCounter();
    bindGlobalNav();
    return;
  }
  if (pathPart === '/login') {
    app.innerHTML = authView('login');
    bindGlobalNav();
    bindAuthForm('login');
    return;
  }
  if (pathPart === '/signup') {
    app.innerHTML = authView('signup');
    bindGlobalNav();
    bindAuthForm('signup');
    return;
  }
  if (pathPart.startsWith('/checkout/')) {
    if (!Api.getUser()) {
      window.location.hash = '/login';
      return;
    }
    const followers = Number(pathPart.split('/')[2]);
    app.innerHTML = checkoutView(followers, cachedPackages);
    bindGlobalNav();
    renderCheckoutBody(followers, cachedPackages);
    return;
  }
  if (pathPart === '/dashboard') {
    if (!Api.getUser()) {
      window.location.hash = '/login';
      return;
    }
    app.innerHTML = dashboardView();
    bindGlobalNav();
    await loadOrders();
    fulfillmentPoller = setInterval(loadOrders, 4000);
    return;
  }
  if (pathPart === '/admin') {
    const user = Api.getUser();
    if (!user || user.role !== 'admin') {
      window.location.hash = '/login';
      return;
    }
    app.innerHTML = adminView();
    bindGlobalNav();
    await loadAdmin();
    fulfillmentPoller = setInterval(loadAdmin, 4000);
    return;
  }

  app.innerHTML = `${navBar()}<div class="app-shell"><div class="empty-state"><h3>Page not found</h3></div></div>`;
  bindGlobalNav();
}

function bindGlobalNav() {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = el.getAttribute('data-nav');
      if (target.startsWith('/#')) {
        window.location.hash = '/';
        setTimeout(() => {
          const id = target.split('#')[1];
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      } else {
        window.location.hash = target;
      }
    });
  });
  document.querySelectorAll('[data-action="logout"]').forEach((el) => {
    el.addEventListener('click', () => {
      Api.clearSession();
      window.location.hash = '/';
      router();
    });
  });
}

function animateCounter() {
  const el = document.getElementById('counter');
  if (!el) return;
  let val = 2340;
  setInterval(() => {
    val += Math.floor(Math.random() * 3);
    el.textContent = val.toLocaleString('en-IN');
  }, 2500);
}

// ---------------- Auth ----------------

function bindAuthForm(mode) {
  const form = document.getElementById('auth-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('form-msg');
    msgEl.innerHTML = '';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span>`;

    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const result = mode === 'login'
        ? await Api.login(data.email, data.password)
        : await Api.register(data.name, data.email, data.password);
      Api.setSession(result.token, result.user);
      window.location.hash = result.user.role === 'admin' ? '/admin' : '/dashboard';
      router();
    } catch (err) {
      msgEl.innerHTML = `<div class="form-error">${err.message}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? 'Log in' : 'Create account';
    }
  });
}

// ---------------- Checkout ----------------

function renderCheckoutBody(followers, packages) {
  const pkg = packages.find((p) => p.followers === followers) || packages[0];
  const body = document.getElementById('checkout-body');
  body.innerHTML = `
    <div class="checkout-grid">
      <div class="card">
        <h3 style="margin-bottom:18px;font-size:19px">Order summary</h3>
        <div class="field">
          <label for="handle">Instagram handle</label>
          <input id="handle" type="text" placeholder="yourusername" />
          <div class="hint">Followers are delivered to this public profile.</div>
        </div>
        <div class="summary-line"><span>Package</span><span>${pkg.followers.toLocaleString('en-IN')} followers</span></div>
        <div class="summary-line"><span>Delivery</span><span>24–48 hours</span></div>
        <div class="summary-line total"><span>Total</span><span>${fmtInr(pkg.priceInr)}</span></div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:18px;font-size:19px">Payment method</h3>
        <div class="pay-tabs">
          <div class="pay-tab active" data-method="card">Card</div>
          <div class="pay-tab" data-method="upi">UPI</div>
        </div>
        <div id="pay-panel"></div>
        <div id="pay-msg"></div>
      </div>
    </div>
  `;

  let method = 'card';
  const tabs = body.querySelectorAll('.pay-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      method = tab.getAttribute('data-method');
      renderPayPanel(method, pkg);
    });
  });
  renderPayPanel(method, pkg);

  function renderPayPanel(m, pkg) {
    const panel = document.getElementById('pay-panel');
    document.getElementById('pay-msg').innerHTML = '';
    if (m === 'card') {
      panel.innerHTML = `
        <div class="field"><label>Card number</label><input id="cc-number" placeholder="4242 4242 4242 4242" /></div>
        <div style="display:flex;gap:12px">
          <div class="field" style="flex:1"><label>Expiry</label><input id="cc-expiry" placeholder="MM/YY" /></div>
          <div class="field" style="flex:1"><label>CVC</label><input id="cc-cvc" placeholder="123" /></div>
        </div>
        <button class="btn btn-primary btn-block" id="pay-card-btn">Pay ${fmtInr(pkg.priceInr)}</button>
        <div class="test-card-hint">Test mode — use <code>4242 4242 4242 4242</code> for a successful charge, or <code>4000 0000 0000 0002</code> to see a decline.</div>
      `;
      document.getElementById('pay-card-btn').addEventListener('click', async () => {
        await submitOrderAndPay(pkg, 'card', {
          cardNumber: document.getElementById('cc-number').value,
          expiry: document.getElementById('cc-expiry').value,
          cvc: document.getElementById('cc-cvc').value,
        });
      });
    } else {
      const upiString = encodeURIComponent(
        `upi://pay?pa=tollofollow@demo&pn=TolloFollow&am=${pkg.priceInr}&cu=INR`
      );
      panel.innerHTML = `
        <div class="qr-box">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${upiString}" width="220" height="220" alt="UPI QR code" />
          <div class="qr-amount">${fmtInr(pkg.priceInr)}</div>
          <div class="qr-note">Scan with any UPI app, then confirm below. Demo QR — no real transaction.</div>
        </div>
        <button class="btn btn-primary btn-block" id="pay-upi-btn">I've completed the payment</button>
      `;
      document.getElementById('pay-upi-btn').addEventListener('click', async () => {
        await submitOrderAndPay(pkg, 'upi', null);
      });
    }
  }

  async function submitOrderAndPay(pkg, method, cardData) {
    const handle = document.getElementById('handle').value.trim();
    const msgEl = document.getElementById('pay-msg');
    msgEl.innerHTML = '';
    if (!handle) {
      msgEl.innerHTML = `<div class="form-error">Enter your Instagram handle first.</div>`;
      return;
    }
    const btn = document.querySelector('#pay-panel button.btn-primary');
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;

    try {
      const { order } = await Api.createOrder(pkg.followers, handle, method);
      if (method === 'card') {
        await Api.payCard(order.id, cardData);
      } else {
        await Api.payUpiConfirm(order.id);
      }
      window.location.hash = '/dashboard';
      router();
    } catch (err) {
      msgEl.innerHTML = `<div class="form-error">${err.message}</div>`;
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }
}

// ---------------- Dashboard ----------------

async function loadOrders() {
  try {
    const { orders } = await Api.myOrders();
    const body = document.getElementById('orders-body');
    if (!body) return;
    if (orders.length === 0) {
      body.innerHTML = `<div class="empty-state"><h3>No orders yet</h3><p>Pick a package to get your first order moving.</p></div>`;
      return;
    }
    body.innerHTML = `<div class="order-list">${orders.map(orderCard).join('')}</div>`;
  } catch (err) {
    if (err.status === 401) {
      Api.clearSession();
      window.location.hash = '/login';
      router();
    }
  }
}

function orderCard(order) {
  const showProgress = order.paymentStatus === 'paid';
  return `
    <div class="order-card">
      <div class="order-main">
        <div class="order-title">${order.packageFollowers.toLocaleString('en-IN')} followers → @${order.instagramHandle}</div>
        <div class="order-meta">Order #${order.id} · ${fmtDate(order.createdAt)} · ${fmtInr(order.priceInr)} · ${order.paymentMethod.toUpperCase()}</div>
      </div>
      <div class="order-progress-wrap">
        ${showProgress ? `
          <div class="progress-track"><div class="progress-fill" style="width:${order.progress}%"></div></div>
          <div class="progress-caption">${order.fulfillmentStatus === 'completed' ? 'Delivered' : order.progress + '% delivered'}</div>
        ` : `<div class="progress-caption">Delivery starts once payment is confirmed</div>`}
      </div>
      <div>${statusBadge(order)}</div>
    </div>
  `;
}

// ---------------- Admin ----------------

async function loadAdmin() {
  try {
    const [{ orders }, { stats }] = await Promise.all([Api.adminOrders(), Api.adminStats()]);

    const statsBody = document.getElementById('stats-body');
    if (statsBody) {
      statsBody.innerHTML = `
        <div class="stat-card"><div class="stat-label">Revenue (paid orders)</div><div class="stat-value">${fmtInr(stats.totalRevenue)}</div></div>
        <div class="stat-card"><div class="stat-label">Total orders</div><div class="stat-value">${stats.totalOrders}</div></div>
        <div class="stat-card"><div class="stat-label">Awaiting UPI verification</div><div class="stat-value">${stats.pendingVerification}</div></div>
        <div class="stat-card"><div class="stat-label">Customers</div><div class="stat-value">${stats.totalUsers}</div></div>
      `;
    }

    const body = document.getElementById('admin-body');
    if (!body) return;
    if (orders.length === 0) {
      body.innerHTML = `<div class="empty-state"><h3>No orders yet</h3></div>`;
      return;
    }
    body.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Package</th><th>Amount</th><th>Payment</th><th>Delivery</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${orders.map(adminRow).join('')}
          </tbody>
        </table>
      </div>
    `;
    body.querySelectorAll('[data-verify]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await Api.adminVerify(btn.getAttribute('data-verify'));
        loadAdmin();
      });
    });
    body.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await Api.adminReject(btn.getAttribute('data-reject'));
        loadAdmin();
      });
    });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      window.location.hash = '/login';
      router();
    }
  }
}

function adminRow(order) {
  const canVerify = order.paymentStatus === 'pending_verification';
  return `
    <tr>
      <td>#${order.id}</td>
      <td>${order.customerName}<br/><span style="color:var(--text-faint);font-size:12.5px">${order.customerEmail}</span></td>
      <td>${order.packageFollowers.toLocaleString('en-IN')} → @${order.instagramHandle}</td>
      <td>${fmtInr(order.priceInr)}</td>
      <td>${statusBadge(order)}</td>
      <td>${order.paymentStatus === 'paid' ? (order.fulfillmentStatus === 'completed' ? 'Delivered' : order.progress + '%') : '—'}</td>
      <td>
        ${canVerify ? `
          <div class="row-actions">
            <button class="btn btn-primary btn-sm" data-verify="${order.id}">Verify</button>
            <button class="btn btn-ghost btn-sm" data-reject="${order.id}">Reject</button>
          </div>` : '—'}
      </td>
    </tr>
  `;
}

// ---------------- Boot ----------------

(async function init() {
  try {
    const { packages } = await Api.packages();
    cachedPackages = packages;
  } catch {
    cachedPackages = PACKAGES_FALLBACK;
  }
  window.addEventListener('hashchange', router);
  router();
})();
