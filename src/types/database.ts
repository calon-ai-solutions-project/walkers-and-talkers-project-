// Hand-authored to mirror supabase/migrations until the real schema is linked.
//
// IMPORTANT: after the first `supabase db push`, regenerate this file from the
// live schema and commit it:
//   supabase gen types typescript --linked > src/types/database.ts
// The generated version is authoritative; this hand-written one only exists so
// the app type-checks before the project is linked.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Role = "super_admin" | "regional_admin" | "volunteer";
export type CardState = "pending" | "active" | "lost" | "revoked";
export type AttendanceMethod = "nfc" | "qr" | "manual" | "name";
export type WelfareStage = "missed_you" | "welfare_check" | "escalated";

type Timestamps = {
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      regions: {
        Row: {
          id: string;
          slug: string;
          name: string;
          walk_day: string;
          walk_time: string;
          contact_email: string | null;
          active: boolean | null;
        } & Timestamps;
        Insert: {
          id?: string;
          slug: string;
          name: string;
          walk_day: string;
          walk_time: string;
          contact_email?: string | null;
          active?: boolean | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["regions"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: Role;
          region_id: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: Role;
          region_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          member_no: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          postcode: string | null;
          date_of_birth: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relationship: string | null;
          health_notes: string | null;
          region_id: string;
          member_since_year: number;
          joined_at: string | null;
          needs_full_data: boolean | null;
          data_source: string | null;
          active: boolean | null;
          updated_at: string;
        } & Timestamps;
        Insert: {
          id?: string;
          member_no: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          postcode?: string | null;
          date_of_birth?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relationship?: string | null;
          health_notes?: string | null;
          region_id: string;
          member_since_year?: number;
          joined_at?: string | null;
          needs_full_data?: boolean | null;
          data_source?: string | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          member_id: string;
          token: string;
          hardware_uid: string | null;
          state: CardState;
          issued_at: string | null;
          revoked_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          token: string;
          hardware_uid?: string | null;
          state?: CardState;
          issued_at?: string | null;
          revoked_at?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          region_id: string;
          session_date: string;
          opened_at: string | null;
          closed_at: string | null;
          cancelled: boolean | null;
          cancelled_reason: string | null;
          opened_by: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          region_id: string;
          session_date: string;
          opened_at?: string | null;
          closed_at?: string | null;
          cancelled?: boolean | null;
          cancelled_reason?: string | null;
          opened_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          session_id: string;
          member_id: string;
          checked_in_at: string;
          method: AttendanceMethod;
          card_id: string | null;
          recorded_by: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          member_id: string;
          checked_in_at?: string;
          method: AttendanceMethod;
          card_id?: string | null;
          recorded_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
        Relationships: [];
      };
      welfare_flags: {
        Row: {
          id: string;
          member_id: string;
          flagged_at: string | null;
          weeks_absent: number;
          stage: WelfareStage;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_note: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          flagged_at?: string | null;
          weeks_absent: number;
          stage: WelfareStage;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["welfare_flags"]["Insert"]>;
        Relationships: [];
      };
      email_log: {
        Row: {
          id: string;
          member_id: string;
          template: string;
          sent_at: string | null;
          subject: string | null;
          resend_id: string | null;
          status: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          template: string;
          sent_at?: string | null;
          subject?: string | null;
          resend_id?: string | null;
          status?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["email_log"]["Insert"]>;
        Relationships: [];
      };
      checkin_attempts: {
        Row: {
          id: string;
          token_attempted: string | null;
          card_id: string | null;
          member_id: string | null;
          session_id: string | null;
          result: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          token_attempted?: string | null;
          card_id?: string | null;
          member_id?: string | null;
          session_id?: string | null;
          result: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["checkin_attempts"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      members_safe: {
        Row: {
          id: string;
          member_no: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          postcode: string | null;
          region_id: string;
          member_since_year: number;
          joined_at: string | null;
          needs_full_data: boolean | null;
          active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      auth_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      auth_region: {
        Args: Record<string, never>;
        Returns: string;
      };
      check_in_by_token: {
        Args: { p_token: string; p_method?: string };
        Returns: Json;
      };
      check_in_member: {
        Args: { p_member_id: string; p_session_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
