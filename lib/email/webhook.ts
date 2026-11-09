/**
 * What a Resend delivery event means for the subscriber (spec §11
 * /api/webhooks/resend): a permanent bounce stops the mail (`bounced`), a
 * spam complaint counts as unsubscribing. Everything else is ignored.
 */
export type DeliveryAction = { status: "bounced" | "unsubscribed"; emails: string[] } | null;

type EventLike = { type: string; data?: { to?: string[]; bounce?: { type?: string } } };

export function deliveryAction(event: EventLike): DeliveryAction {
  const emails = (event.data?.to ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return null;
  if (event.type === "email.complained") return { status: "unsubscribed", emails };
  // Transient bounces (mailbox full, greylisting…) are retried by the next day's mail.
  if (event.type === "email.bounced" && event.data?.bounce?.type?.toLowerCase() === "permanent") {
    return { status: "bounced", emails };
  }
  return null;
}
