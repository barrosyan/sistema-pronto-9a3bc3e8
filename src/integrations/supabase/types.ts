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
          user_id: string
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
          user_id: string
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
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          cadence: string | null
          company: string | null
          created_at: string | null
          id: string
          job_titles: string | null
          name: string
          objective: string | null
          profile_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cadence?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          job_titles?: string | null
          name: string
          objective?: string | null
          profile_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cadence?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          job_titles?: string | null
          name?: string
          objective?: string | null
          profile_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      file_uploads: {
        Row: {
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          attended_webinar: boolean | null
          campaign: string
          campaign_id: string | null
          classification: string | null
          comments: string | null
          company: string | null
          connection_date: string | null
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
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          attended_webinar?: boolean | null
          campaign: string
          campaign_id?: string | null
          classification?: string | null
          comments?: string | null
          company?: string | null
          connection_date?: string | null
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
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          attended_webinar?: boolean | null
          campaign?: string
          campaign_id?: string | null
          classification?: string | null
          comments?: string | null
          company?: string | null
          connection_date?: string | null
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
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
