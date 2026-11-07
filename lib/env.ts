/**
 * Environment variable access, validated with zod.
 *
 * Each group is read lazily so a page that never sends mail does not fail
 * just because RESEND_API_KEY is missing. Server-only values never use the
 * NEXT_PUBLIC_ prefix (CLAUDE.md rule 5).
 */
import { z } from "zod";

const SupabasePublicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const ServiceEnv = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const AppEnv = z.object({
  APP_URL: z.url().transform((u) => u.replace(/\/+$/, "")),
  ADMIN_EMAILS: z.string().default(""),
  DIGEST_SIZE: z.coerce.number().int().min(1).max(10).default(3),
});

const LinkEnv = z.object({
  EMAIL_LINK_SECRET: z.string().min(32, "EMAIL_LINK_SECRET must be at least 32 characters"),
});

const EmailEnv = z.object({
  EMAIL_FROM: z.string().min(3),
  /** "resend" (default) sends for real; "file" writes rendered mail to .outbox/ for local checks. */
  EMAIL_TRANSPORT: z.enum(["resend", "file"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
});

function parseGroup<T extends z.ZodType>(schema: T, group: string): z.output<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid ${group} environment variables: ${fields}. See .env.example.`);
  }
  return result.data;
}

export function supabasePublicEnv() {
  // Referenced literally so Next.js can inline NEXT_PUBLIC_* values if this is
  // ever used from browser code.
  const result = SupabasePublicEnv.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) {
    throw new Error(
      "Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.",
    );
  }
  return result.data;
}

export function serviceEnv() {
  return parseGroup(ServiceEnv, "Supabase service");
}

export function appEnv() {
  return parseGroup(AppEnv, "app");
}

export function linkEnv() {
  return parseGroup(LinkEnv, "email link");
}

export function emailEnv() {
  const env = parseGroup(EmailEnv, "email");
  if (env.EMAIL_TRANSPORT === "resend" && !env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when EMAIL_TRANSPORT=resend.");
  }
  return env;
}

export function adminEmails(): string[] {
  return appEnv()
    .ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
