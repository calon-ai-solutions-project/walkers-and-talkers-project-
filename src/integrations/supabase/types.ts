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
          method: Database["public"]["Enums"]["checkin_method"]
          recorded_by: string | null
          session_id: string
        }
        Insert: {
          card_id?: string | null
          checked_in_at?: string
          id?: string
          member_id: string
          method: Database["public"]["Enums"]["checkin_method"]
          recorded_by?: string | null
          session_id: string
        }
        Update: {
          card_id?: string | null
          checked_in_at?: string
          id?: string
          member_id?: string
          method?: Database["public"]["Enums"]["checkin_method"]
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
          activated_at: string | null
          created_at: string
          id: string
          issued_at: string | null
          member_id: string
          notes: string | null
          revoked_at: string | null
          state: Database["public"]["Enums"]["card_state"]
          token: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          member_id: string
          notes?: string | null
          revoked_at?: string | null
          state?: Database["public"]["Enums"]["card_state"]
          token: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          member_id?: string
          notes?: string | null
          revoked_at?: string | null
          state?: Database["public"]["Enums"]["card_state"]
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
      email_log: {
        Row: {
          error: string | null
          id: string
          member_id: string | null
          sent_at: string
          status: string | null
          subject: string | null
          template: string | null
          to_email: string
        }
        Insert: {
          error?: string | null
          id?: string
          member_id?: string | null
          sent_at?: string
          status?: string | null
          subject?: string | null
          template?: string | null
          to_email: string
        }
        Update: {
          error?: string | null
          id?: string
          member_id?: string | null
          sent_at?: string
          status?: string | null
          subject?: string | null
          template?: string | null
          to_email?: string
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
          active: boolean
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          health_notes: string | null
          id: string
          last_name: string
          member_no: string | null
          member_since: string | null
          needs_full_data: boolean
          phone: string | null
          postcode: string | null
          region_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          health_notes?: string | null
          id?: string
          last_name: string
          member_no?: string | null
          member_since?: string | null
          needs_full_data?: boolean
          phone?: string | null
          postcode?: string | null
          region_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          health_notes?: string | null
          id?: string
          last_name?: string
          member_no?: string | null
          member_since?: string | null
          needs_full_data?: boolean
          phone?: string | null
          postcode?: string | null
          region_id?: string
          updated_at?: string
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
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          region_id: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          region_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          region_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
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
          colour: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          colour?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          colour?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          cancel_reason: string | null
          cancelled: boolean
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          opened_at: string | null
          opened_by: string | null
          region_id: string
          session_date: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled?: boolean
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          region_id: string
          session_date?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled?: boolean
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          region_id?: string
          session_date?: string
        }
        Relationships: [
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
          flagged_at: string
          id: string
          member_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          stage: Database["public"]["Enums"]["welfare_stage"]
          weeks_absent: number | null
        }
        Insert: {
          flagged_at?: string
          id?: string
          member_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stage?: Database["public"]["Enums"]["welfare_stage"]
          weeks_absent?: number | null
        }
        Update: {
          flagged_at?: string
          id?: string
          member_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stage?: Database["public"]["Enums"]["welfare_stage"]
          weeks_absent?: number | null
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
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          member_no: string | null
          member_since: string | null
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
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          member_no?: string | null
          member_since?: string | null
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
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          member_no?: string | null
          member_since?: string | null
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
    }
    Functions: {
      check_in_by_token: { Args: { p_token: string }; Returns: Json }
      current_region: { Args: never; Returns: string }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      manual_check_in: {
        Args: { p_member_id: string; p_session_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "regional_admin" | "volunteer"
      card_state: "pending" | "active" | "lost" | "revoked"
      checkin_method: "nfc" | "manual"
      welfare_stage: "missed_you" | "welfare_check" | "escalated" | "resolved"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "regional_admin", "volunteer"],
      card_state: ["pending", "active", "lost", "revoked"],
      checkin_method: ["nfc", "manual"],
      welfare_stage: ["missed_you", "welfare_check", "escalated", "resolved"],
    },
  },
} as const
