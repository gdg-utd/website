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
      application_admins: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      application_email_queue: {
        Row: {
          application_id: number
          created_at: string
          id: number
          idempotency_key: string
          last_error: string | null
          opening_id: number
          payload: Json
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: string
          template_key: string
        }
        Insert: {
          application_id: number
          created_at?: string
          id?: never
          idempotency_key: string
          last_error?: string | null
          opening_id: number
          payload?: Json
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          template_key: string
        }
        Update: {
          application_id?: number
          created_at?: string
          id?: never
          idempotency_key?: string
          last_error?: string | null
          opening_id?: number
          payload?: Json
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_email_queue_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_email_queue_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "application_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: number
          created_at: string
          details: Json
          event_type: string
          id: number
        }
        Insert: {
          actor_id?: string | null
          application_id: number
          created_at?: string
          details?: Json
          event_type: string
          id?: never
        }
        Update: {
          actor_id?: string | null
          application_id?: number
          created_at?: string
          details?: Json
          event_type?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_openings: {
        Row: {
          accent: string
          closes_at: string | null
          created_at: string
          description: string
          details: Json
          email_templates: Json
          eyebrow: string
          form_schema: Json
          form_version: number
          id: number
          opens_at: string | null
          responsibilities: Json
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string
          closes_at?: string | null
          created_at?: string
          description: string
          details?: Json
          email_templates: Json
          eyebrow: string
          form_schema: Json
          form_version?: number
          id?: never
          opens_at?: string | null
          responsibilities?: Json
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string
          closes_at?: string | null
          created_at?: string
          description?: string
          details?: Json
          email_templates?: Json
          eyebrow?: string
          form_schema?: Json
          form_version?: number
          id?: never
          opens_at?: string | null
          responsibilities?: Json
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applicant_email: string
          applicant_first_name: string
          applicant_id: string
          applicant_last_name: string
          created_at: string
          decision_published_at: string | null
          decision_published_by: string | null
          form_version: number
          id: number
          opening_id: number
          published_decision: string
          responses: Json
          submission_state: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          applicant_email: string
          applicant_first_name: string
          applicant_id: string
          applicant_last_name: string
          created_at?: string
          decision_published_at?: string | null
          decision_published_by?: string | null
          form_version: number
          id?: never
          opening_id: number
          published_decision?: string
          responses?: Json
          submission_state?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          applicant_email?: string
          applicant_first_name?: string
          applicant_id?: string
          applicant_last_name?: string
          created_at?: string
          decision_published_at?: string | null
          decision_published_by?: string | null
          form_version?: number
          id?: never
          opening_id?: number
          published_decision?: string
          responses?: Json
          submission_state?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "application_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          last_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      publish_staged_application_decisions: {
        Args: Record<PropertyKey, never>
        Returns: {
          application_id: number
          decision: string
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
