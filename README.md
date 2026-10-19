# YGuard Webhook Relay

Tiny Node relay that accepts panel events (ban, VIP grant, server online) and fans them out to **Discord** webhooks.

```bash
npm i && npm run build
WEBHOOK_URL=https://discord.com/api/webhooks/... node dist/server.js
```

`POST /event` with JSON `{ "type": "ban", "player": "...", "reason": "..." }`.

MIT · [@kianPk](https://github.com/kianPk)
