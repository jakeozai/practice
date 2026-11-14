/**
 * Hand-written types for supabase/migrations/0001–0011, in the shape that
 * `supabase gen types typescript` produces. Regenerate with the CLI once a
 * Supabase project is linked, and keep this file in sync with migrations.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type EnglishLevel = "none" | "reading" | "conversational" | "business" | "native";

/** jobs.category (0011: video·design·motion_3d·dev·writing added for scope C). */
export type JobCategory = "language" | "domain" | "labeling" | "video" | "design" | "motion_3d" | "dev" | "writing" | "other";

export type Database = {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          name: string;
          kind: "greenhouse" | "lever" | "ashby" | "recruitee" | "page" | "manual" | "freelancer";
          endpoint: string | null;
          trusted: boolean;
          active: boolean;
          fail_count: number;
          last_fetched_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          kind: "greenhouse" | "lever" | "ashby" | "recruitee" | "page" | "manual" | "freelancer";
          endpoint?: string | null;
          trusted?: boolean;
          active?: boolean;
          fail_count?: number;
          last_fetched_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
        Relationships: [];
      };
      raw_postings: {
        Row: {
          id: string;
          source_id: string;
          external_id: string;
          url: string;
          title: string | null;
          location_raw: string | null;
          body: string | null;
          body_hash: string;
          fetched_at: string;
          first_seen_at: string;
          processed_hash: string | null;
        };
        Insert: {
          id?: string;
          source_id: string;
          external_id: string;
          url: string;
          title?: string | null;
          location_raw?: string | null;
          body?: string | null;
          body_hash: string;
          fetched_at?: string;
          first_seen_at?: string;
          processed_hash?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["raw_postings"]["Insert"]>;
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          raw_posting_id: string | null;
          company: string;
          title: string;
          title_ko: string | null;
          title_normalized: string;
          url: string;
          summary_ko: string[];
          category: JobCategory | null;
          languages: string[];
          requires_credential: boolean;
          korea_eligible: boolean | null;
          eligibility_note: string | null;
          pay_min: number | null;
          pay_max: number | null;
          pay_currency: string | null;
          pay_unit: "hour" | "task" | "project" | "month" | null;
          hours_per_week_min: number | null;
          english_level: EnglishLevel | null;
          engagement: "freelance" | "contract" | "part_time" | "permanent" | null;
          status: "open" | "pool" | "closed" | "unknown";
          repost_count: number;
          scam_score: number;
          review_state: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          first_seen_at: string;
          last_seen_at: string;
          missing_count: number;
          embedding: string | null;
        };
        Insert: {
          id?: string;
          raw_posting_id?: string | null;
          company: string;
          title: string;
          title_ko?: string | null;
          title_normalized: string;
          url: string;
          summary_ko?: string[];
          category?: JobCategory | null;
          languages?: string[];
          requires_credential?: boolean;
          korea_eligible?: boolean | null;
          eligibility_note?: string | null;
          pay_min?: number | null;
          pay_max?: number | null;
          pay_currency?: string | null;
          pay_unit?: "hour" | "task" | "project" | "month" | null;
          hours_per_week_min?: number | null;
          english_level?: EnglishLevel | null;
          engagement?: "freelance" | "contract" | "part_time" | "permanent" | null;
          status?: "open" | "pool" | "closed" | "unknown";
          repost_count?: number;
          scam_score?: number;
          review_state?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          missing_count?: number;
          embedding?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          email: string;
          digest_status: "active" | "paused" | "unsubscribed" | "bounced";
          profile_json: Json | null;
          profile_source: "ai_import" | "form" | null;
          profile_imported_at: string | null;
          english_level: EnglishLevel | null;
          fields: string[];
          skills: string[];
          avoid: string[];
          weekly_hours: number | null;
          min_hourly_usd: number | null;
          has_desktop: boolean | null;
          embedding: string | null;
          last_opened_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          digest_status?: "active" | "paused" | "unsubscribed" | "bounced";
          profile_json?: Json | null;
          profile_source?: "ai_import" | "form" | null;
          profile_imported_at?: string | null;
          english_level?: EnglishLevel | null;
          fields?: string[];
          skills?: string[];
          avoid?: string[];
          weekly_hours?: number | null;
          min_hourly_usd?: number | null;
          has_desktop?: boolean | null;
          embedding?: string | null;
          last_opened_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
          user_id: string;
          job_id: string;
          send_date: string;
          rank: number;
          score: number;
          reason_ko: string | null;
          clicked_at: string | null;
          feedback: "interested" | "not_interested" | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          job_id: string;
          send_date: string;
          rank: number;
          score: number;
          reason_ko?: string | null;
          clicked_at?: string | null;
          feedback?: "interested" | "not_interested" | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      digest_sends: {
        Row: {
          user_id: string;
          send_date: string;
          status: "sent" | "failed" | "skipped";
          job_count: number;
          resend_message_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          send_date: string;
          status?: "sent" | "failed" | "skipped";
          job_count?: number;
          resend_message_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["digest_sends"]["Insert"]>;
        Relationships: [];
      };
      digest_picks: {
        Row: {
          user_id: string;
          send_date: string;
          job_ids: string[];
          notes: Json;
          subject: string | null;
          method: "llm" | "rules";
          created_at: string;
        };
        Insert: {
          user_id: string;
          send_date: string;
          job_ids: string[];
          notes?: Json;
          subject?: string | null;
          method: "llm" | "rules";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["digest_picks"]["Insert"]>;
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          draft_en: Json | null;
          status: "drafted" | "applied" | "assessment" | "accepted" | "rejected" | "paid";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          draft_en?: Json | null;
          status?: "drafted" | "applied" | "assessment" | "accepted" | "rejected" | "paid";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          job_id: string | null;
          stage_reached: "applied" | "assessment" | "accepted" | "paid" | null;
          paid_as_promised: boolean | null;
          actual_hourly_usd: number | null;
          project_days: number | null;
          tips_ko: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company: string;
          job_id?: string | null;
          stage_reached?: "applied" | "assessment" | "accepted" | "paid" | null;
          paid_as_promised?: boolean | null;
          actual_hourly_usd?: number | null;
          project_days?: number | null;
          tips_ko?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      verify_cron_token: {
        Args: { p_token: string };
        Returns: boolean;
      };
      claim_login_link: {
        Args: { p_email_hash: string; p_ip_hash: string | null };
        Returns: string;
      };
      raw_postings_to_process: {
        Args: { p_limit?: number };
        Returns: Database["public"]["Tables"]["raw_postings"]["Row"][];
      };
      candidate_jobs_for_user: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: {
          job_id: string;
          similarity: number;
          first_seen_at: string;
          pay_max: number | null;
          pay_unit: string | null;
          english_level: string | null;
          hours_per_week_min: number | null;
          title: string;
          category: string | null;
          languages: string[];
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
