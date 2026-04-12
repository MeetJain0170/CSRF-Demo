/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           CSRF ATTACK SIMULATION - SERVER                   ║
 * ║           Educational Demo | Security Research              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * HOW TO RUN:
 *   npm install
 *   node server.js
 *
 * BURP SUITE SETUP:
 *   1. Set Burp proxy: 127.0.0.1:8080
 *   2. Configure browser to use that proxy
 *   3. Visit http://localhost:3000 — you'll see GET /
 *   4. Submit transfer — intercept POST /transfer
 *   5. Observe: amount, recipient, csrf_token (if protection ON)
 *
 * CSRF on/off: use the checkbox on the bank page (POST /toggle-csrf).
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// ─────────────────────────────────────────────
// 🔴 TOGGLE THIS FLAG TO ENABLE/DISABLE PROTECTION
// false = vulnerable (attack succeeds)
// true  = protected  (attack blocked)
// ─────────────────────────────────────────────
let csrfProtection = false;

// ─────────────────────────────────────────────
// In-memory state (no DB needed)
// ─────────────────────────────────────────────
let bankState = {
  user: 'Meet Jain',
  accountNumber: 'XX-4821-9934',
  balance: 10000000,
  transactions: []
};

// In-memory CSRF token store: { sessionId -> csrfToken }
const csrfTokenStore = {};

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(express.urlencoded({ extended: true })); // standard form POST — Burp Suite friendly
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Assign session ID cookie if not present
app.use((req, res, next) => {
  if (!req.cookies.sessionId) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    res.cookie('sessionId', sessionId, { httpOnly: true });
    req.cookies.sessionId = sessionId;
  }
  next();
});

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

/**
 * GET /
 * Serves the main bank dashboard
 * BURP: Observe the full HTML response — contains embedded CSRF token (if protection ON)
 */
app.get('/', (req, res) => {
  const sessionId = req.cookies.sessionId;
  let csrfToken = '';

  if (csrfProtection) {
    // Generate a new CSRF token tied to this session
    csrfToken = crypto.randomBytes(32).toString('hex');
    csrfTokenStore[sessionId] = csrfToken;
    console.log(`[CSRF] Token generated for session ${sessionId.slice(0, 8)}...: ${csrfToken.slice(0, 16)}...`);
  }

  res.send(buildBankHTML(csrfToken));
});

/**
 * POST /transfer
 * Handles money transfer
 * BURP: Intercept this request to see:
 *   - amount
 *   - recipient
 *   - csrf_token (if protection ON)
 *   - Cookie: sessionId (automatically attached by browser — THIS is what CSRF exploits)
 */
app.post('/transfer', (req, res) => {
  const { amount, recipient, csrf_token } = req.body;
  const sessionId = req.cookies.sessionId;

  console.log('\n─────────────────────────────────────');
  console.log('📥 POST /transfer received');
  console.log(`   Session  : ${sessionId ? sessionId.slice(0, 8) + '...' : 'NONE'}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Amount   : ₹${amount}`);
  console.log(`   CSRF Mode: ${csrfProtection ? '🛡️  PROTECTED' : '🔴 VULNERABLE'}`);
  console.log(`   Token    : ${csrf_token ? csrf_token.slice(0, 16) + '...' : 'NOT PROVIDED'}`);

  // ─── CSRF PROTECTION CHECK ───────────────────
  if (csrfProtection) {
    const storedToken = csrfTokenStore[sessionId];

    if (!csrf_token || csrf_token !== storedToken) {
      console.log('🚫 CSRF ATTACK BLOCKED! Token mismatch or missing.');
      console.log('─────────────────────────────────────\n');
      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'CSRF attack blocked! Token invalid or missing.'
      });
    }

    // Keep token valid for the whole session so multiple legit transfers work
    // without requiring a full page reload to fetch a new token.
    console.log('✅ CSRF token validated.');
  }
  // ─────────────────────────────────────────────

  const transferAmount = parseFloat(amount);

  if (!transferAmount || transferAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount.' });
  }

  if (transferAmount > bankState.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance.' });
  }

  // Execute transfer
  bankState.balance -= transferAmount;
  const tx = {
    id: `TXN${Date.now()}`,
    timestamp: new Date().toLocaleTimeString('en-IN'),
    recipient,
    amount: transferAmount,
    balanceAfter: bankState.balance
  };
  bankState.transactions.unshift(tx);

  console.log(`💸 Transfer executed: ₹${transferAmount} → ${recipient}`);
  console.log(`   New balance: ₹${bankState.balance}`);
  console.log('─────────────────────────────────────\n');

  res.json({
    success: true,
    message: `₹${transferAmount} transferred to ${recipient}`,
    newBalance: bankState.balance,
    transaction: tx
  });
});

/**
 * GET /state
 * Returns current bank state (for live UI updates)
 */
app.get('/state', (req, res) => {
  res.json({
    ...bankState,
    csrfProtection
  });
});

/**
 * POST /reset
 * Resets the bank balance for demo purposes
 */
app.post('/reset', (req, res) => {
  bankState.balance = 10000000;
  bankState.transactions = [];
  console.log('🔄 Bank state reset to ${bankState.balance}');
  res.json({ success: true, message: 'Balance reset to ₹10,000' });
});

// ─────────────────────────────────────────────
// HTML Builder — returns full bank page with injected token
// ─────────────────────────────────────────────
function buildBankHTML(csrfToken) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PaisaLeloBank — Secure Banking</title>
  <link rel="stylesheet" href="/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body>

<!-- 
  ╔═══════════════════════════════════════╗
  ║  BURP SUITE OBSERVATION POINTS:       ║
  ║  1. This page load = GET /            ║
  ║     → See csrf_token in hidden input  ║
  ║  2. Submit form = POST /transfer      ║
  ║     → Params: amount, recipient,      ║
  ║       csrf_token, Cookie: sessionId   ║
  ╚═══════════════════════════════════════╝
-->

<div class="noise-overlay"></div>

<nav class="navbar">
  <div class="nav-brand">
    <span class="brand-icon">◈</span>
    <span class="brand-name">PaisaLeloBank</span>
  </div>
  <div class="nav-status ${csrfToken ? 'status-protected' : 'status-vulnerable'}">
    ${csrfToken
      ? '<span class="status-dot"></span> CSRF Protection ON'
      : '<span class="status-dot"></span> CSRF Protection OFF'}
  </div>
  <label class="switch">
    <input type="checkbox" id="csrfToggle" onchange="toggleCSRF(this)">
    <span class="slider"></span>
  </label>
  <div class="nav-user">
    <span class="user-avatar">MJ</span>
    <span>Meet Jain</span>
  </div>
</nav>

<main class="dashboard">

  <!-- Balance Card -->
  <section class="balance-section">
    <div class="balance-card">
      <div class="balance-card__header">
        <span class="balance-label">Available Balance</span>
        <span class="account-number">XX-4821-9934</span>
      </div>
      <div class="balance-amount" id="balance-display">
        ₹<span id="balance-value">10,000</span>
      </div>
      <div class="balance-card__footer">
        <div class="stat">
          <span class="stat-label">Account Holder</span>
          <span class="stat-value">Meet Jain</span>
        </div>
        <div class="stat">
          <span class="stat-label">Account Type</span>
          <span class="stat-value">Savings</span>
        </div>
      </div>
      <div class="card-glow"></div>
    </div>
  </section>

  <div class="content-grid">

    <!-- Transfer Form -->
    <section class="transfer-section">
      <div class="section-header">
        <h2>Fund Transfer</h2>
        <span class="section-badge">Instant</span>
      </div>

      <!-- 
        BURP SUITE: Intercept this form POST
        - Standard urlencoded POST (no fetch/XHR weirdness)
        - Parameters visible in Burp's Params tab:
            amount=<value>
            recipient=<value>
            csrf_token=<token_or_empty>
      -->
      <form id="transferForm" action="/transfer" method="POST">
        <input type="hidden" name="csrf_token" value="${csrfToken}" id="csrf_token_field" />

        <div class="form-group">
          <label for="recipient">Recipient Account / UPI ID</label>
          <input
            type="text"
            id="recipient"
            name="recipient"
            placeholder="e.g. friend@upi or ACC123456"
            required
          />
        </div>

        <div class="form-group">
          <label for="amount">Amount (₹)</label>
          <div class="amount-input-wrapper">
            <span class="currency-symbol">₹</span>
            <input
              type="number"
              id="amount"
              name="amount"
              placeholder="0.00"
              min="1"
              required
            />
          </div>
        </div>

        <div class="quick-amounts">
          <button type="button" class="quick-btn" onclick="setAmount(500)">₹500</button>
          <button type="button" class="quick-btn" onclick="setAmount(1000)">₹1,000</button>
          <button type="button" class="quick-btn" onclick="setAmount(5000)">₹5,000</button>
        </div>

        <button type="submit" class="submit-btn" id="submitBtn">
          <span class="btn-text">Transfer Funds</span>
          <span class="btn-arrow">→</span>
        </button>
      </form>

      <div id="alertBox" class="alert-box hidden"></div>
    </section>

    <!-- Transaction History -->
    <section class="history-section">
      <div class="section-header">
        <h2>Recent Transactions</h2>
        <button onclick="resetBalance()" class="reset-btn">↺ Reset Demo</button>
      </div>
      <div id="txList" class="tx-list">
        <div class="tx-empty">No transactions yet</div>
      </div>

      <!-- CSRF Mode Indicator -->
      <div class="csrf-indicator ${csrfToken ? 'mode-protected' : 'mode-vulnerable'}">
        <div class="csrf-icon">${csrfToken ? '🛡️' : '⚠️'}</div>
        <div class="csrf-text">
          <strong>${csrfToken ? 'Protected Mode' : 'Vulnerable Mode'}</strong>
          <span>${csrfToken
            ? 'CSRF token embedded in form. Attacker cannot replicate it.'
            : 'No CSRF token. Any site can forge this request.'}</span>
        </div>
      </div>
    </section>

  </div>
</main>

<script src="/app.js"></script>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║      CSRF DEMO SERVER — RUNNING          ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Bank App  → http://localhost:${PORT}       ║`);
  console.log(`║  CSRF Mode → ${csrfProtection ? '🛡️  PROTECTED          ' : '🔴 VULNERABLE         '} ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Toggle CSRF: use checkbox on bank UI    ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  BURP SUITE:                             ║');
  console.log('║  Proxy → 127.0.0.1:8080                  ║');
  console.log('║  Intercept POST /transfer                ║');
  console.log('╚══════════════════════════════════════════╝\n');
});

app.post('/toggle-csrf', (req, res) => {
  csrfProtection = !csrfProtection;

  console.log(`🔁 CSRF Protection toggled → ${csrfProtection ? 'ON' : 'OFF'}`);

  res.json({
    success: true,
    csrfProtection
  });
});

app.get('/transfer-get', (req, res) => {
  const { amount, recipient } = req.query;

  console.log('\n📥 GET /transfer-get triggered via IMAGE CSRF');

  const transferAmount = parseFloat(amount);

  if (!transferAmount || transferAmount <= 0) {
    return res.send('Invalid request');
  }

  // ❗ NO CSRF CHECK HERE (intentionally vulnerable)
  bankState.balance -= transferAmount;

  console.log(`💸 (GET CSRF) ₹${transferAmount} → ${recipient}`);
  console.log(`New balance: ₹${bankState.balance}`);

  res.send('OK'); // image doesn’t care about response
});