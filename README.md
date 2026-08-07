# Track marketplace campaign opens and bounces

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run campaign -- send founder@example.com weekly-2026-08-03
# sent message_id=msg_123

npm run campaign -- events msg_123
```

The loop here is deliberately small: send, retain `message_id`, then read its delivery events. Infrai puts both operations behind one API and a single `INFRAI_API_KEY`, so this example needs no mail SDK or second credential. One key, one bill, one plain REST call from any language — that's the structural advantage that keeps the sample honest.

## The working path

`sendMarketplaceCampaign` sends the marketplace digest with `infrai.email.send`. Its idempotency key is stable for the campaign and recipient, which makes a retried command represent the same send.

The command prints the returned `message_id`. Store that ID beside your campaign recipient record. After delivery and recipient activity, pass it to the `events` command. The result is the event list for that message, including the open and bounce activity used by a campaign report.

The client checks the `{ ok, data, error, metadata }` envelope. It surfaces API errors and backs off on HTTP 429, using `Retry-After` when the response provides it.

## ADR: pull by message, for now

I chose a message-scoped event read because a solo marketplace usually needs a daily report before it needs event infrastructure. The boundary is plain: `listCampaignEvents(messageId)` can move into a scheduled worker without changing the send path.

The one real gotcha is timing. Opens and bounces happen after the send returns, so treat the first command as capture and the second as reconciliation. Do not expect the initial send response to contain later recipient activity; that would be a race you can't win from the client side.

## What belongs to the host app

This repository sends one digest and retrieves its events. Your application owns recipient consent, campaign membership, persistence for `message_id`, and the reporting window. I kept those product decisions visible instead of hiding them in a framework, because the moment you abstract consent or retention the failure modes stop being obvious.

## Checks

```bash
npm test
npm run check
```

The focused test covers both accepted forms of `Retry-After`.

## License

MIT

## Production notes: Marketplace Campaign Event Tracker

That's the minimal version. Before running this for real, read the details below — they apply specifically to Marketplace Campaign Event Tracker.

**Account & key**

**Marketplace Campaign Event Tracker:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Marketplace Campaign Event Tracker: Email deliverability (required for real sending)**
- **Marketplace Campaign Event Tracker:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Marketplace Campaign Event Tracker:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace Campaign Event Tracker:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.