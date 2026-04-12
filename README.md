# NeoBank — CSRF attack simulation

This project is an **educational security demo**. It simulates a small “bank” web app (PaisaLeloBank) and a **fake scam funnel**: a normal-looking travel page (`index.html`) hides a **sponsored link** to a **free iPhone** page (`attack.html`). That page submits a hidden form to your bank so you can show **Cross-Site Request Forgery (CSRF)** in two modes: protection **off** (the forged transfer can go through) and **on** (the server rejects requests without a valid CSRF token).

You also get a **fake money transfer** form on the bank dashboard as a side feature, so you can compare **legitimate** transfers (with a token when protection is on) against the **attack**.

# ◈ PaisaLeloBank — CSRF Attack Simulation
> Educational security demo: See a CSRF attack succeed, then watch it get blocked.
---

## File layout

```
Roleplay/
├── server.js              # Express server: bank routes, CSRF check, /toggle-csrf, in-memory balance
├── package.json           # npm dependencies and scripts
├── package-lock.json      # Locked dependency versions (commit this)
├── requirements.txt       # Human-readable list of runtime + packages (not for `pip`)
├── index.html             # Decoy “travel” page with a link to the iPhone scam (attack.html)
├── attack.html            # Malicious lure + hidden POST to the bank
├── serve_static.js        # Optional tiny static helper (if you use it)
├── public/
│   ├── app.js             # Bank UI: transfers, live balance sync, CSRF toggle
│   └── styles.css         # Bank styling
└── assets/                # Images used by the attack / lure pages
```

---

## Prerequisites

1. **Install Node.js (LTS)**  
   Download from [https://nodejs.org/](https://nodejs.org/).  
   Confirm in a terminal:

   ```bash
   node -v
   npm -v
   ```

2. **Install project dependencies**  
   This repo uses **npm**, not Python. The `requirements.txt` file only **describes** what you need; installing is done with:

   ```bash
   cd path/to/Roleplay
   npm install
   ```

   (That reads `package.json` / `package-lock.json` and installs `express`, `cookie-parser`, etc.)

---

## How to run

1. Start the bank API and static files served by Express:

   ```bash
   node server.js
   ```

   Or:

   ```bash
   npm start
   ```

2. Open the **bank** in the browser:

   **http://localhost:3000**

3. Serve the **rest of the site** (so `index.html`, `attack.html`, and `assets/` resolve correctly) on **port 5500**. For example:

   ```bash
   npx serve -p 5500 .
   ```

   Then open:

   - **http://localhost:5500/** — decoy page (`index.html`)
   - **http://localhost:5500/attack.html** — scam page (or reach it via the iPhone link on `index.html`)

---

## Burp Suite (Community Edition)

1. **Download** Burp Suite **Community** from [https://portswigger.net/burp/communitydownload](https://portswigger.net/burp/communitydownload) and install it (free for learning and testing).

2. Start Burp and use the **embedded browser** (simplest):

   - Go to **Proxy** → **HTTP history** (you will see traffic here after browsing).
   - Use **Proxy** → open **Intercept** if you want to stop each request, or browse with interception off and still inspect history.

   Alternatively use **Open browser** / Burp’s preconfigured browser so traffic goes through Burp automatically (wording may vary slightly by Burp version).

3. In that browser, visit:

   - **http://localhost:3000** — bank  
   - **http://localhost:5500** — decoy site and scam page  

4. In **HTTP history**, look for **`POST /transfer`**: body fields like `amount`, `recipient`, and when CSRF is on, `csrf_token`. Compare a **normal** transfer from the bank form vs the **attack** from `attack.html`.

---

## Suggested demo flow

1. Run **`node server.js`** and **`npx serve -p 5500 .`** as above.

2. Open **`index.html` with Live Server** (VS Code “Go Live”) **or** use **http://localhost:5500** — same idea: you need a real HTTP origin so links and assets work.

3. On the decoy page, click the **free iPhone** sponsored block (it opens `attack.html`).

4. Switch to the **bank** tab (**http://localhost:3000**).

5. **CSRF toggle (bank UI)**  
   - **Off** — “scam” / forged request can succeed (classic vulnerable demo).  
   - **On** — the same attack should be **blocked**; legitimate transfers from the bank still work because the page includes the CSRF token.

6. Optionally use the bank’s **Fund Transfer** to move fake money and show a **clean** request next to the **attack** in Burp.

---

## npm scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm start`    | Run `node server.js` |
| `npm run dev`  | Run with `nodemon`   |

---

## Educational note

Use this only against **your own machine** and this demo. CSRF is a real class of vulnerabilities; the goal here is to **understand** cookies, forged requests, and token-based defenses—not to target other people’s systems.
