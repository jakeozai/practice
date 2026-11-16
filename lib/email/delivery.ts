/**
 * Applies a bounce or complaint to the subscriber, whichever mail service
 * reported it (Resend or SES webhooks): a permanent bounce → 'bounced', a
 * spam complaint → 'unsubscribed'.
 */
import { createAdminClient } from "../supabase/admin";
import type { DeliveryAction } from "./webhook";

export async function applyDeliveryAction(action: NonNullable<DeliveryAction>): Promise<{ error: string | null }> {
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ digest_status: action.status, updated_at: new Date().toISOString() })
    .in("email", action.emails)
    .in("digest_status", action.status === "bounced" ? ["active", "paused", "unsubscribed"] : ["active", "paused"]);
  return { error: error?.message ?? null };
}
