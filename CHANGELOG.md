# Changelog

## 1.1.0

- Optional HMAC verify via `WEBHOOK_SECRET` + `X-YGuard-Signature` (sha256 hex of body)
- Forward retries up to 3× with exponential backoff
- In-memory event log (last 50) at `GET /events`
- `GET /health` → `{ ok, forwarded, failed }`
- GitHub Actions CI
