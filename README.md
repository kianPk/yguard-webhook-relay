# YGuard Webhook Relay

Tiny Node relay that accepts panel events (ban, VIP grant, server online) and fans them out to **Discord** webhooks.

## Features

- Optional HMAC: `WEBHOOK_SECRET` + header `X-YGuard-Signature` (sha256 hex of body)
- Forward retries (3× backoff)
- `GET /events` — last 50 in-memory log entries
- `GET /health` → `{ ok, forwarded, failed }`

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) (current **1.1.0**).

```bash
npm i && npm run build
WEBHOOK_URL=https://discord.com/api/webhooks/... WEBHOOK_SECRET=… node dist/server.js
```

`POST /event` with JSON `{ "type": "ban", "player": "...", "reason": "..." }`.

MIT · [@kianPk](https://github.com/kianPk)
