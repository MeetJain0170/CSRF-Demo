/**
 * NeoBank — Frontend Logic
 * Handles form submission, balance updates, transaction history
 *
 * Note:
 * This uses fetch() for the legit bank transfer UX.
 * The CSRF "attack" happens from `attack.html` via a normal HTML form POST.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  startLiveSync();

  const form = document.getElementById('transferForm');
  form.addEventListener('submit', handleTransfer);
});

let lastStateSignature = '';
let transferInFlight = false;

// ── Load current state from server ───────────────────────
async function loadState() {
  try {
    const res = await fetch('/state');
    const state = await res.json();
    applyStateToUI(state, { animateBalance: false });
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

function applyStateToUI(state, { animateBalance }) {
  const firstTxId = state.transactions?.[0]?.id ?? '';
  const sig = `${state.balance}|${firstTxId}|${state.transactions?.length ?? 0}`;

  if (sig !== lastStateSignature) {
    const shouldAnimate = animateBalance && lastStateSignature !== '';
    updateBalanceDisplay(state.balance, shouldAnimate);
    renderTransactions(state.transactions);
    lastStateSignature = sig;
  }

  const toggle = document.getElementById('csrfToggle');
  if (toggle) toggle.checked = !!state.csrfProtection;
}

function startLiveSync() {
  // Keeps dashboard updated even when an "attack" happens in another tab.
  // Light polling keeps the demo simple (no websockets needed).
  setInterval(async () => {
    if (transferInFlight) return;
    try {
      const res = await fetch('/state', { cache: 'no-store' });
      const state = await res.json();
      applyStateToUI(state, { animateBalance: true });
    } catch {
      // ignore transient errors during refresh/server restarts
    }
  }, 1000);
}

// ── Handle Transfer Form Submit ───────────────────────────
async function handleTransfer(e) {
  e.preventDefault();

  const form = e.target;
  const btn = document.getElementById('submitBtn');
  const amount = document.getElementById('amount').value;
  const recipient = document.getElementById('recipient').value;
  const csrf_token = document.getElementById('csrf_token_field').value;

  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Processing...';
  hideAlert();
  transferInFlight = true;

  try {
    const res = await fetch('/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ amount, recipient, csrf_token })
    });

    const data = await res.json();

    if (data.success) {
      showAlert(`✓ ${data.message}`, 'success');
      updateBalanceDisplay(data.newBalance, true);
      addTransactionToList(data.transaction);
      form.reset();
    } else if (data.blocked) {
      showAlert(`🚫 ${data.message}`, 'danger');
    } else {
      showAlert(`⚠ ${data.message}`, 'danger');
    }
  } catch {
    showAlert('⚠ Network error. Is the server running?', 'danger');
  } finally {
    transferInFlight = false;
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Transfer Funds';
  }
}

// ── Update balance display with animation ────────────────
function updateBalanceDisplay(balance, animate = false) {
  const valueEl = document.getElementById('balance-value');
  const amountEl = document.querySelector('.balance-amount');

  valueEl.textContent = Number(balance).toLocaleString('en-IN');

  if (animate) {
    amountEl.classList.remove('shake');
    void amountEl.offsetWidth; // force reflow
    amountEl.classList.add('shake');
  }
}

// ── Render all transactions ───────────────────────────────
function renderTransactions(transactions) {
  const list = document.getElementById('txList');

  if (!transactions || transactions.length === 0) {
    list.innerHTML = '<div class="tx-empty">No transactions yet</div>';
    return;
  }

  list.innerHTML = transactions.map((tx) => txItemHTML(tx)).join('');
}

// ── Add single transaction to top of list ────────────────
function addTransactionToList(tx) {
  const list = document.getElementById('txList');
  const empty = list.querySelector('.tx-empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.innerHTML = txItemHTML(tx);
  list.prepend(div.firstChild);
}

// ── Transaction item HTML ─────────────────────────────────
function txItemHTML(tx) {
  return `
    <div class="tx-item">
      <div class="tx-icon">↑</div>
      <div class="tx-info">
        <div class="tx-recipient">${escapeHTML(tx.recipient)}</div>
        <div class="tx-time">${tx.timestamp} · ${tx.id}</div>
      </div>
      <div class="tx-amount">−₹${Number(tx.amount).toLocaleString('en-IN')}</div>
    </div>`;
}

// ── Quick amount buttons ──────────────────────────────────
function setAmount(val) {
  document.getElementById('amount').value = val;
}

// ── Alert helpers ─────────────────────────────────────────
function showAlert(message, type) {
  const box = document.getElementById('alertBox');
  box.textContent = message;
  box.className = `alert-box alert-${type}`;
  box.classList.remove('hidden');

  if (type === 'success') {
    setTimeout(() => hideAlert(), 4000);
  }
}

function hideAlert() {
  document.getElementById('alertBox').classList.add('hidden');
}

// ── Reset demo balance ────────────────────────────────────
async function resetBalance() {
  try {
    const res = await fetch('/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      updateBalanceDisplay(10000000, false);
      document.getElementById('txList').innerHTML = '<div class="tx-empty">No transactions yet</div>';
      showAlert('✓ Demo reset. Balance restored to ₹1,00,00,000', 'success');
    }
  } catch {
    showAlert('Reset failed', 'danger');
  }
}

async function toggleCSRF(el) {
  const res = await fetch('/toggle-csrf', { method: 'POST' });
  const data = await res.json();

  // Sync toggle visually
  el.checked = data.csrfProtection;

  // Optional subtle toast instead of alert
  showAlert(
    data.csrfProtection 
      ? '🛡️ CSRF Protection Enabled' 
      : '⚠️ CSRF Protection Disabled',
    data.csrfProtection ? 'success' : 'danger'
  );

  // Reload to regenerate token properly
  setTimeout(() => window.location.reload(), 800);
}

// ── Sanitize output ───────────────────────────────────────
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

