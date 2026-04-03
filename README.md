# ◈ PaisaLeloBank — CSRF Attack Simulation
> Educational security demo: See a CSRF attack succeed, then watch it get blocked.

---

## 📁 Project Structure

```
csrf-demo/
├── server.js           ← Express backend (CSRF toggle here)
├── attack.html         ← Malicious page (open separately)
├── package.json
└── public/
    ├── styles.css      ← Banking UI styles
    └── app.js          ← Frontend logic
```

---

## 🚀 Quick Start

```bash
npm install
node server.js
```

Open: http://localhost:3000

For the attack page — open `attack.html` directly in browser,
or serve it on port 5500:
```bash
npx serve -p 5500 .
# Then visit: http://localhost:5500/attack.html
```

---

## 🎬 Demo Flow

### Step 1 — Show vulnerable state
1. Ensure `csrfProtection = false` in `server.js` (default)
2. Open http://localhost:3000 → Balance shows ₹10,000
3. Note the red "CSRF Protection OFF" badge in nav

### Step 2 — Execute the attack
1. Open `attack.html` in another tab
2. Click "Claim My Prize" button
3. Switch back to bank → balance drops to ₹5,000 💥
4. Console shows: `Transfer executed: ₹5000 → hacker_account`

### Step 3 — Enable protection
1. In `server.js`, change: `let csrfProtection = false;` → `true`
2. Restart: `node server.js`
3. Open http://localhost:3000 → Now shows green "CSRF Protection ON"
4. Inspect page source → find hidden `csrf_token` in the form

### Step 4 — Attack fails
1. Click "Claim My Prize" again on attack.html
2. Attack status shows: 🛡️ **Attack BLOCKED!**
3. Bank balance unchanged
4. Console shows: `CSRF ATTACK BLOCKED! Token mismatch or missing.`

### Step 5 — Reset for next run
Click the "↺ Reset Demo" button in the bank UI.

---

## 🔍 Burp Suite Integration

1. Set Burp proxy: `127.0.0.1:8080`
2. Configure browser proxy to match
3. Turn on Intercept in Burp

**Observe these requests:**

| Request | What you'll see |
|---------|----------------|
| `GET /` | HTML with embedded `csrf_token` (if protection ON) |
| `POST /transfer` (legit) | `amount`, `recipient`, `csrf_token`, `Cookie: sessionId` |
| `POST /transfer` (attack) | Same params but **no `csrf_token`** |

---

## ⚙️ Toggle Protection

In `server.js`, line ~25:

```js
let csrfProtection = false;  // 🔴 Vulnerable
let csrfProtection = true;   // 🛡️ Protected
```

Restart the server after changing.

---

## 💡 Key Insight

> The browser automatically attaches session cookies to **every** request,  
> even ones forged by malicious third-party pages.  
> CSRF exploits this trust.  
> The fix: include a **secret token** only the real page knows.

---

*"We didn't hack the system… we proved how easily it can be misled—and how simply it can be fixed."*
