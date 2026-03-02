// server.js
import express from "express";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ===============================
   HOME PAGE (Freeflo UI)
================================ */
app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Freeflo</title>
<meta name="theme-color" content="#e11d48" />
<style>
:root{
  --bg0:#07070a;
  --bg1:#0b0b11;
  --card: rgba(255,255,255,.06);
  --border: rgba(255,255,255,.12);
  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.68);
  --red:#ef4444;
  --red2:#e11d48;
  --shadow: 0 20px 60px rgba(0,0,0,.55);
  --radius: 18px;
}

*{ box-sizing:border-box; }
body{
  margin:0;
  font-family: system-ui, Arial;
  color:var(--text);
  background:
    radial-gradient(1000px 600px at 20% 0%, rgba(239,68,68,.28), transparent 60%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
  display:flex;
  align-items:center;
  justify-content:center;
  padding:28px;
}

.wrap{ width:min(900px, 100%); }

.brand{
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:20px;
}

.logo{
  width:44px;height:44px;
  border-radius:14px;
  background: linear-gradient(135deg, var(--red), var(--red2));
  box-shadow: 0 12px 30px rgba(225,29,72,.35);
}

h1{ margin:0; }

.card{
  background: var(--card);
  border:1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding:24px;
}

input{
  width:100%;
  padding:14px;
  border-radius:14px;
  border:1px solid var(--border);
  background:#111;
  color:white;
  font-size:15px;
  margin-bottom:10px;
}

button{
  padding:14px;
  border-radius:14px;
  border:none;
  background: linear-gradient(135deg, var(--red), var(--red2));
  color:white;
  font-weight:bold;
  cursor:pointer;
}

button:hover{ opacity:.9; }

.status{
  margin-top:15px;
  font-size:14px;
  color:var(--muted);
}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <div class="logo"></div>
    <div>
      <h1>Freeflo</h1>
      <div style="color:var(--muted);font-size:13px;">
        Paste a link → find contentUrl → open it
      </div>
    </div>
  </div>

  <div class="card">
    <input id="url" placeholder="Paste a link (https://...)" />
    <button id="go">Find & Open</button>
    <div class="status" id="status"></div>
  </div>
</div>

<script>
const input = document.getElementById("url");
const btn = document.getElementById("go");
const status = document.getElementById("status");

btn.onclick = async () => {
  const url = input.value.trim();
  if(!url){
    status.textContent = "Paste a URL first.";
    return;
  }

  status.textContent = "Searching for contentUrl...";
  try{
    const res = await fetch("/api/find", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    if(!res.ok){
      status.textContent = data.error || "Not found.";
      return;
    }

    status.textContent = "Found! Opening...";
    setTimeout(()=>{
      window.location.href = "/open?u=" + encodeURIComponent(data.contentUrl);
    }, 500);

  }catch(e){
    status.textContent = "Request failed.";
  }
};

input.addEventListener("keydown", e=>{
  if(e.key==="Enter") btn.click();
});
</script>
</body>
</html>`);
});

/* ===============================
   API: FIND contentUrl
================================ */
app.post("/api/find", async (req, res) => {
  try {
    const rawUrl = String(req.body?.url || "").trim();
    if (!rawUrl) return res.status(400).json({ error: "Missing url" });

    const target = new URL(rawUrl);
    if (!["http:", "https:"].includes(target.protocol)) {
      return res.status(400).json({ error: "Only http/https allowed" });
    }

    const html = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html"
      }
    }).then(r => r.text());

    const contentUrl = extractContentUrl(html);
    if (!contentUrl) {
      return res.status(404).json({ error: "No contentUrl found." });
    }

    const resolved = new URL(contentUrl, target).toString();
    return res.json({ contentUrl: resolved });

  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
});

/* ===============================
   REDIRECT
================================ */
app.get("/open", (req, res) => {
  try{
    const parsed = new URL(req.query.u);
    return res.redirect(parsed.toString());
  }catch{
    return res.status(400).send("Invalid URL");
  }
});

/* ===============================
   HELPERS
================================ */
function extractContentUrl(html) {
  const match =
    html.match(/"contentUrl"\s*:\s*"([^"]+)"/i) ||
    html.match(/"contenturl"\s*:\s*"([^"]+)"/i);
  return match?.[1] || null;
}

/* ===============================
   PRIVACY POLICY
================================ */
app.get("/privacy", (req, res) => {
  res.type("html").send(`
    <!doctype html>
    <html>
    <head>
      <title>Freeflo Privacy Policy</title>
    </head>
    <body style="font-family:Arial;max-width:800px;margin:40px auto;line-height:1.6;">
      <h1>Freeflo Privacy Policy</h1>

      <p>Freeflo does not collect, store, or sell personal information.</p>

      <p>When a user submits a URL, it is sent to https://freeflo.onrender.com 
      solely to extract contentUrl metadata.</p>

      <p>No personal data is stored or tracked.</p>

      <p>Freeflo does not use analytics, advertising, or tracking tools.</p>

    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Freeflo running on port " + PORT));