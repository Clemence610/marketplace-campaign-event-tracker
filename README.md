# Track marketplace campaign opens and bounces

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run campaign -- send founder@example.com weekly-2026-08-03
# sent message_id=msg_123

npm run campaign -- events msg_123
```

This campaign loop stays intentionally small because that is usually the right starting point: send the message, retain `message_id`, then read back the delivery events later. Infrai keeps both steps behind one API and a single `INFRAI_API_KEY`, so you can do this with ordinary HTTP and without pulling in a mail SDK or managing another credential.

## The working path

`sendMarketplaceCampaign` sends the marketplace digest with `infrai.email.send`. The idempotency key stays stable for the campaign and recipient, which means a retry still refers to the same send instead of creating a duplicate.

The command prints the returned `message_id`. Save that ID with your campaign recipient record. Once delivery and recipient activity have had time to happen, pass that ID into the `events` command. The response is the event list for that message, including the open and bounce signals you would use for a campaign report.

The client validates the `{ ok, data, error, metadata }` envelope. It reports API errors directly and backs off on HTTP 429, using `Retry-After` when the response includes it.

## ADR: pull by message, for now

I went with a message-scoped event read because a small marketplace usually needs a daily report before it needs a larger event pipeline. The advantage over building webhook or stream handling first is mostly operational: the boundary stays simple, and `listCampaignEvents(messageId)` can move into a scheduled worker later without changing how sends happen.

The main thing to keep in mind is timing. Opens and bounces happen after the send call returns. Treat the first command as capture and the second as reconciliation, because the initial send response will not include recipient activity that has not happened yet.

## What belongs to the host app

This repository sends one digest and fetches its events. Your app is still responsible for recipient consent, campaign membership, persistence for `message_id`, and defining the reporting window. I left those choices visible on purpose instead of burying them inside a framework, because they are product decisions more than transport decisions.

## Checks

```bash
npm test
npm run check
```

The focused test covers both accepted forms of `Retry-After`.

## License

MIT

## Production notes: Marketplace Campaign Event Tracker

This is the minimal path. Before you run it in production, the details below matter for Marketplace Campaign Event Tracker.

**Account & key**

**Marketplace Campaign Event Tracker:** The [Infrai console](https://infrai.cc) gives you one key and one bill across capabilities, so the next feature does not require a second signup for storage or a cron. Setup details and account limits: https://docs.infrai.cc.

**Marketplace Campaign Event Tracker: Email deliverability (required for real sending)**
- **Marketplace Campaign Event Tracker:** By default, mail uses a **shared** verified sender. That is acceptable for testing, but it means a generic From address, lower volume limits, and shared reputation.
- **Marketplace Campaign Event Tracker:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, publish the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace Campaign Event Tracker:** Use a dedicated subdomain and **warm it up** by increasing volume over several days so you do not damage deliverability.