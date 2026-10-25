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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      utd_academic_programs: { Row: {degree: string; major: string}; Insert: {degree: string; major: string}; Update: {degree?: string; major?: string}; Relationships: [] }

      email_blacklist: {
        Row: { email: string; created_at: string }
        Insert: { email: string; created_at?: string }
        Update: { email?: string; created_at?: string }
        Relationships: []
      }
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
          attempts: number
          next_attempt_at: string
          provider_idempotency_key: string
          lease_token: string | null
          locked_until: string | null
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
          attempts?: number
          next_attempt_at?: string
          provider_idempotency_key?: string
          lease_token?: string | null
          locked_until?: string | null
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
          attempts?: number
          next_attempt_at?: string
          provider_idempotency_key?: string
          lease_token?: string | null
          locked_until?: string | null
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
      application_rsvps: {
        Row: {
          agreements_confirmed_at: string | null
          application_id: number
          created_at: string
          deadline_at: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agreements_confirmed_at?: string | null
          application_id: number
          created_at?: string
          deadline_at: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreements_confirmed_at?: string | null
          application_id?: number
          created_at?: string
          deadline_at?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_rsvps_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
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
          form_schema_snapshot: Json
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
          form_schema_snapshot: Json
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
          form_schema_snapshot?: Json
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
      password_reset_rate_limits: {
        Row: {
          expires_at: string
          key_hash: string
          request_count: number
          window_started_at: string
        }
        Insert: {
          expires_at: string
          key_hash: string
          request_count?: number
          window_started_at?: string
        }
        Update: {
          expires_at?: string
          key_hash?: string
          request_count?: number
          window_started_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          degree: string | null
          first_name: string
          github_url: string | null
          id: string
          last_name: string
          linkedin_url: string | null
          major: string | null
          net_id: string | null
          onboarding_completed_at: string | null
          personal_email: string | null
          portfolio_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          first_name: string
          github_url?: string | null
          id: string
          last_name: string
          linkedin_url?: string | null
          major?: string | null
          net_id?: string | null
          onboarding_completed_at?: string | null
          personal_email?: string | null
          portfolio_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          first_name?: string
          github_url?: string | null
          id?: string
          last_name?: string
          linkedin_url?: string | null
          major?: string | null
          net_id?: string | null
          onboarding_completed_at?: string | null
          personal_email?: string | null
          portfolio_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_email_templates: {
        Row: {
          active: boolean
          brevo_template_id: number
          template_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brevo_template_id: number
          template_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brevo_template_id?: number
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reserve_password_reset: { Args: {p_email: string; p_email_key: string; p_global_key: string}; Returns: boolean }
      claim_application_email: { Args: {queue_id: number}; Returns: Database["public"]["Tables"]["application_email_queue"]["Row"][] }
      expire_application_email_leases: { Args: Record<PropertyKey, never>; Returns: undefined }
      is_application_email_worker: { Args: {p_token: string}; Returns: boolean }

      get_staff_application_page: { Args: {p_q?: string; p_position?: string; p_decision?: string; p_page?: number; p_page_size?: number}; Returns: Json }
      application_email_status: { Args: {target_application_id: number}; Returns: {id: number; template_key: string; status: string; attempts: number; next_attempt_at: string; last_error: string | null}[] }
      retry_application_email: { Args: {target_queue_id: number}; Returns: {application_id: number; template_key: string}[] }

      is_email_blacklisted: {
        Args: { candidate_email: string }
        Returns: boolean
      }
      consume_password_reset_rate_limit: {
        Args: {
          p_key_hash: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      mark_officer_application_not_selected: {
        Args: { target_application_id: number }
        Returns: boolean
      }
      publish_staged_application_decisions: {
        Args: { target_opening_id: number }
        Returns: {
          application_id: number
          decision: string
        }[]
      }
      release_expired_mentee_offers: {
        Args: { target_opening_id: number }
        Returns: {
          expired_application_id: number
        }[]
      }
      respond_to_mentee_offer: {
        Args: {
          agreements_confirmed?: boolean
          response: string
          target_application_id: number
        }
        Returns: {
          response_recorded_at: string
          rsvp_status: string
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
