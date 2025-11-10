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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_metrics: {
        Row: {
          campaign_name: string
          created_at: string | null
          daily_data: Json | null
          event_type: string
          id: string
          profile_name: string
          total_count: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_name: string
          created_at?: string | null
          daily_data?: Json | null
          event_type: string
          id?: string
          profile_name: string
          total_count?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_name?: string
          created_at?: string | null
          daily_data?: Json | null
          event_type?: string
          id?: string
          profile_name?: string
          total_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          attended_webinar: boolean | null
          campaign: string
          classification: string | null
          comments: string | null
          company: string | null
          created_at: string | null
          follow_up_1_comments: string | null
          follow_up_1_date: string | null
          follow_up_2_comments: string | null
          follow_up_2_date: string | null
          follow_up_3_comments: string | null
          follow_up_3_date: string | null
          follow_up_4_comments: string | null
          follow_up_4_date: string | null
          follow_up_reason: string | null
          had_follow_up: boolean | null
          id: string
          linkedin: string | null
          meeting_date: string | null
          meeting_schedule_date: string | null
          name: string
          negative_response_date: string | null
          observations: string | null
          pavilion: string | null
          position: string | null
          positive_response_date: string | null
          profile: string | null
          proposal_date: string | null
          proposal_value: number | null
          sale_date: string | null
          sale_value: number | null
          stand: string | null
          stand_day: string | null
          status: string
          status_details: string | null
          transfer_date: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          attended_webinar?: boolean | null
          campaign: string
          classification?: string | null
          comments?: string | null
          company?: string | null
          created_at?: string | null
          follow_up_1_comments?: string | null
          follow_up_1_date?: string | null
          follow_up_2_comments?: string | null
          follow_up_2_date?: string | null
          follow_up_3_comments?: string | null
          follow_up_3_date?: string | null
          follow_up_4_comments?: string | null
          follow_up_4_date?: string | null
          follow_up_reason?: string | null
          had_follow_up?: boolean | null
          id?: string
          linkedin?: string | null
          meeting_date?: string | null
          meeting_schedule_date?: string | null
          name: string
          negative_response_date?: string | null
          observations?: string | null
          pavilion?: string | null
          position?: string | null
          positive_response_date?: string | null
          profile?: string | null
          proposal_date?: string | null
          proposal_value?: number | null
          sale_date?: string | null
          sale_value?: number | null
          stand?: string | null
          stand_day?: string | null
          status: string
          status_details?: string | null
          transfer_date?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          attended_webinar?: boolean | null
          campaign?: string
          classification?: string | null
          comments?: string | null
          company?: string | null
          created_at?: string | null
          follow_up_1_comments?: string | null
          follow_up_1_date?: string | null
          follow_up_2_comments?: string | null
          follow_up_2_date?: string | null
          follow_up_3_comments?: string | null
          follow_up_3_date?: string | null
          follow_up_4_comments?: string | null
          follow_up_4_date?: string | null
          follow_up_reason?: string | null
          had_follow_up?: boolean | null
          id?: string
          linkedin?: string | null
          meeting_date?: string | null
          meeting_schedule_date?: string | null
          name?: string
          negative_response_date?: string | null
          observations?: string | null
          pavilion?: string | null
          position?: string | null
          positive_response_date?: string | null
          profile?: string | null
          proposal_date?: string | null
          proposal_value?: number | null
          sale_date?: string | null
          sale_value?: number | null
          stand?: string | null
          stand_day?: string | null
          status?: string
          status_details?: string | null
          transfer_date?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
