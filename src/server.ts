import http from "node:http";

type PanelEvent = {
  type: string;
  player?: string;
  reason?: string;
  server?: string;
  [k: string]: unknown;
};

const PORT = Number(process.env.PORT || 8787);
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";

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

async function forward(ev: PanelEvent) {
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

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (req.method === "POST" && req.url === "/event") {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    try {
      const ev = JSON.parse(Buffer.concat(chunks).toString("utf8")) as PanelEvent;
      await forward(ev);
      res.writeHead(204).end();
    } catch (e) {
      res.writeHead(400).end(String(e));
    }
    return;
  }
  res.writeHead(404).end();
});

server.listen(PORT, () => console.log(`yguard-webhook-relay on :${PORT}`));
