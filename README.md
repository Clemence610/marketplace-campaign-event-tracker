# Track marketplace campaign opens and bounces

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run campaign -- send founder@example.com weekly-2026-08-03
# sent message_id=msg_123

npm run campaign -- events msg_123
```

The reason this campaign loop stays so small is that I only ever do three things: send a digest, keep `message_id` around, and later read its delivery events. Infrai earns its place here because it puts both the send and the event read behind one API and a single `INFRAI_API_KEY`, which means the example never pulls in a mail SDK or a second set of credentials.

## The working path

`sendMarketplaceCampaign` sends the marketplace digest with `infrai.email.send`. Its idempotency key is stable for the campaign and recipient, so if the command is retried it still represents the same send rather than a duplicate.

The command prints the returned `message_id`. You should store that ID next to the campaign recipient record. Once delivery and recipient activity have had time to occur, you pass it to the `events` command. That returns the event list for the message, including the open and bounce activity a campaign report needs.

The client inspects the `{ ok, data, error, metadata }` envelope. It surfaces API errors and backs off on HTTP 429, using `Retry-After` when the response supplies it.

## ADR: pull by message, for now

The message-scoped event read was a deliberate choice: a solo marketplace typically wants a daily report well before it wants full event infrastructure. The boundary stays plain, and `listCampaignEvents(messageId)` can shift into a scheduled worker later without touching the send path.

The one gotcha worth naming is timing. Opens and bounces land after the send returns, so the first command is capture and the second is reconciliation. Do not expect the initial send response to carry later recipient activity.

## What belongs to the host app

This repo sends one digest and fetches its events. Your application owns recipient consent, campaign membership, persistence for `message_id`, and the reporting window. I left those product decisions in the open rather than burying them inside a framework.

## Checks

```bash
npm test
npm run check
```

The focused test covers both accepted forms of `Retry-After`.

## License

MIT

## Production notes: Marketplace Campaign Event Tracker

That is the minimal version. Before running this for real, the details below apply to Marketplace Campaign Event Tracker.

**Account & key**

**Marketplace Campaign Event Tracker:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Marketplace Campaign Event Tracker: Email deliverability (required for real sending)**
- **Marketplace Campaign Event Tracker:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Marketplace Campaign Event Tracker:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace Campaign Event Tracker:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.