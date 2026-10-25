import http from "node:http";
import crypto from "node:crypto";

type PanelEvent = {
  type: string;
  player?: string;
  reason?: string;
  server?: string;
  [k: string]: unknown;
};

type LogEntry = {
  at: string;
  type: string;
  ok: boolean;
  error?: string;
};

const PORT = Number(process.env.PORT || 8787);
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

const eventLog: LogEntry[] = [];
let forwarded = 0;
let failed = 0;

function pushLog(entry: LogEntry) {
  eventLog.push(entry);
  if (eventLog.length > 50) eventLog.shift();
}

function formatDiscord(ev: PanelEvent): object {
  const title = `YGuard · ${ev.type.toUpperCase()}`;
  const lines = [
    ev.player ? `**Player:** ${ev.player}` : null,
    ev.reason ? `**Reason:** ${ev.reason}` : null,
    ev.server ? `**Server:** ${ev.server}` : null
  ].filter(Boolean);
  return {
    embeds: [{
      title,
      description: lines.join("\n") || "_(no details)_",
      color: ev.type === "ban" ? 0xe05b5b : 0xe07a3a,
      timestamp: new Date().toISOString()
    }]
  };
}

function verifySignature(body: Buffer, header: string | undefined): boolean {
  if (!WEBHOOK_SECRET) return true;
  if (!header) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(header.trim(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function forwardOnce(ev: PanelEvent) {
  if (!WEBHOOK_URL) {
    console.log("[dry-run]", ev);
    return;
  }
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(formatDiscord(ev))
  });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
}

/** Retry forward up to 3 attempts with exponential backoff. */
async function forward(ev: PanelEvent) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await forwardOnce(ev);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await sleep(200 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, forwarded, failed }));
    return;
  }
  if (req.method === "GET" && req.url === "/events") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(eventLog));
    return;
  }
  if (req.method === "POST" && req.url === "/event") {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks);
    const sig = req.headers["x-yguard-signature"];
    if (!verifySignature(body, Array.isArray(sig) ? sig[0] : sig)) {
      failed++;
      pushLog({ at: new Date().toISOString(), type: "auth", ok: false, error: "bad signature" });
      res.writeHead(401).end("invalid signature");
      return;
    }
    try {
      const ev = JSON.parse(body.toString("utf8")) as PanelEvent;
      await forward(ev);
      forwarded++;
      pushLog({ at: new Date().toISOString(), type: ev.type || "event", ok: true });
      res.writeHead(204).end();
    } catch (e) {
      failed++;
      const msg = String(e);
      pushLog({ at: new Date().toISOString(), type: "error", ok: false, error: msg });
      res.writeHead(400).end(msg);
    }
    return;
  }
  res.writeHead(404).end();
});

server.listen(PORT, () => console.log(`yguard-webhook-relay on :${PORT}`));
