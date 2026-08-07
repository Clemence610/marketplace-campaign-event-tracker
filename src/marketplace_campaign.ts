import { infrai } from "./infrai_email";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] as string,
  );
}

export async function sendMarketplaceCampaign(to: string, campaignId: string) {
  return infrai.email.send(
    {
      to,
      subject: "This week's marketplace picks",
      html: `<h1>Fresh listings</h1><p>Your marketplace digest for ${escapeHtml(campaignId)} is ready.</p>`,
    },
    `marketplace-campaign:${campaignId}:${to}`,
  );
}

export function listCampaignEvents(messageId: string) {
  return infrai.email.event.list(messageId);
}

function requiredArgument(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Missing ${label}.`);
  return value;
}

async function main() {
  const command = process.argv[2];

  if (command === "send") {
    const to = requiredArgument(process.argv[3], "recipient email");
    const campaignId = requiredArgument(process.argv[4], "campaign id");
    const result = await sendMarketplaceCampaign(to, campaignId);
    console.log(`sent message_id=${result.data.message_id}`);
    return;
  }

  if (command === "events") {
    const messageId = requiredArgument(process.argv[3], "message id");
    const result = await listCampaignEvents(messageId);
    console.dir(result.data, { depth: null });
    return;
  }

  throw new Error("Run with: send <recipient> <campaign-id> or events <message-id>");
}

await main();
