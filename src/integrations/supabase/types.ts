export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          card_id: string | null
          checked_in_at: string
          id: string
          member_id: string
          method: string
          recorded_by: string | null
          session_id: string
        }
        Insert: {
          card_id?: string | null
          checked_in_at?: string
          id?: string
          member_id: string
          method: string
          recorded_by?: string | null
          session_id: string
        }
        Update: {
          card_id?: string | null
          checked_in_at?: string
          id?: string
          member_id?: string
          method?: string
          recorded_by?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          hardware_uid: string | null
          id: string
          issued_at: string | null
          member_id: string
          notes: string | null
          revoked_at: string | null
          state: string
          token: string
        }
        Insert: {
          hardware_uid?: string | null
          id?: string
          issued_at?: string | null
          member_id: string
          notes?: string | null
          revoked_at?: string | null
          state?: string
          token: string
        }
        Update: {
          hardware_uid?: string | null
          id?: string
          issued_at?: string | null
          member_id?: string
          notes?: string | null
          revoked_at?: string | null
          state?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_attempts: {
        Row: {
          card_id: string | null
          created_at: string | null
          id: string
          member_id: string | null
          result: string
          session_id: string | null
          token_attempted: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          result: string
          session_id?: string | null
          token_attempted?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          result?: string
          session_id?: string | null
          token_attempted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_attempts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_attempts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_attempts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          error_message: string | null
          id: string
          member_id: string
          resend_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          sent_status: string | null
          status: string | null
          subject: string | null
          template: string
          week_of: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          member_id: string
          resend_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_status?: string | null
          status?: string | null
          subject?: string | null
          template: string
          week_of?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          member_id?: string
          resend_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_status?: string | null
          status?: string | null
          subject?: string | null
          template?: string
          week_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          active: boolean | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string | null
          data_source: string | null
          date_of_birth: string | null
          email: string | null
          email_opt_out: boolean | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          health_notes: string | null
          id: string
          joined_at: string | null
          last_name: string
          member_no: string
          member_since_year: number
          needs_full_data: boolean | null
          phone: string | null
          photo_consent: boolean | null
          postcode: string | null
          region_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          data_source?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_opt_out?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          health_notes?: string | null
          id?: string
          joined_at?: string | null
          last_name: string
          member_no: string
          member_since_year?: number
          needs_full_data?: boolean | null
          phone?: string | null
          photo_consent?: boolean | null
          postcode?: string | null
          region_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          data_source?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_opt_out?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          health_notes?: string | null
          id?: string
          joined_at?: string | null
          last_name?: string
          member_no?: string
          member_since_year?: number
          needs_full_data?: boolean | null
          phone?: string | null
          photo_consent?: boolean | null
          postcode?: string | null
          region_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          must_change_password: boolean
          region_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          must_change_password?: boolean
          region_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          region_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          active: boolean | null
          contact_email: string | null
          created_at: string | null
          id: string
          name: string
          slug: string
          walk_day: string
          walk_time: string
        }
        Insert: {
          active?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          name: string
          slug: string
          walk_day: string
          walk_time: string
        }
        Update: {
          active?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          walk_day?: string
          walk_time?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          cancelled: boolean | null
          cancelled_reason: string | null
          closed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          region_id: string
          session_date: string
          thank_you_recap: string | null
        }
        Insert: {
          cancelled?: boolean | null
          cancelled_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          region_id: string
          session_date: string
          thank_you_recap?: string | null
        }
        Update: {
          cancelled?: boolean | null
          cancelled_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          region_id?: string
          session_date?: string
          thank_you_recap?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_flags: {
        Row: {
          escalated_to_phone_at: string | null
          flagged_at: string | null
          id: string
          last_email_sent_at: string | null
          member_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          stage: string
          weeks_absent: number
        }
        Insert: {
          escalated_to_phone_at?: string | null
          flagged_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          member_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stage: string
          weeks_absent: number
        }
        Update: {
          escalated_to_phone_at?: string | null
          flagged_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          member_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stage?: string
          weeks_absent?: number
        }
        Relationships: [
          {
            foreignKeyName: "welfare_flags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welfare_flags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welfare_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      members_safe: {
        Row: {
          active: boolean | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          joined_at: string | null
          last_name: string | null
          member_no: string | null
          member_since_year: number | null
          needs_full_data: boolean | null
          phone: string | null
          postcode: string | null
          region_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          joined_at?: string | null
          last_name?: string | null
          member_no?: string | null
          member_since_year?: number | null
          needs_full_data?: boolean | null
          phone?: string | null
          postcode?: string | null
          region_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          joined_at?: string | null
          last_name?: string | null
          member_no?: string | null
          member_since_year?: number | null
          needs_full_data?: boolean | null
          phone?: string | null
          postcode?: string | null
          region_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attendees_view: {
        Row: {
          email: string | null
          email_opt_out: boolean | null
          first_name: string | null
          last_name: string | null
          member_id: string | null
          region_id: string | null
          session_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_card_by_token: { Args: { p_token: string }; Returns: Json }
      auth_region: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: string }
      check_in_by_token: {
        Args: { p_method?: string; p_token: string }
        Returns: Json
      }
      claim_admin: { Args: never; Returns: Json }
      create_member: {
        Args: {
          p_address_line1?: string
          p_data_source?: string
          p_email?: string
          p_emergency_contact_name?: string
          p_emergency_contact_phone?: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_postcode?: string
          p_region_id?: string
        }
        Returns: Json
      }
      log_card_read: { Args: { p_token: string }; Returns: Json }
      manual_check_in: {
        Args: { p_member_id: string; p_session_id: string }
        Returns: Json
      }
      members_who_missed_session: {
        Args: { p_session_id: string }
        Returns: {
          consecutive_misses: number
          email: string
          first_name: string
          last_name: string
          member_id: string
          region_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
