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
      agent_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      agent_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          estimated_cost: string | null
          execution_tokens: number | null
          id: string
          model_used: string | null
          router_reasoning: string | null
          routing_plan: Json | null
          status: string | null
          synthesis: string | null
          task: string
          token_usage: Json | null
          total_skills: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          estimated_cost?: string | null
          execution_tokens?: number | null
          id?: string
          model_used?: string | null
          router_reasoning?: string | null
          routing_plan?: Json | null
          status?: string | null
          synthesis?: string | null
          task: string
          token_usage?: Json | null
          total_skills?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          estimated_cost?: string | null
          execution_tokens?: number | null
          id?: string
          model_used?: string | null
          router_reasoning?: string | null
          routing_plan?: Json | null
          status?: string | null
          synthesis?: string | null
          task?: string
          token_usage?: Json | null
          total_skills?: number | null
        }
        Relationships: []
      }
      api_endpoint_allowlist: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          note: string | null
          pattern: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          note?: string | null
          pattern: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          note?: string | null
          pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_endpoints: {
        Row: {
          captured_at: string | null
          duration_ms: number | null
          host: string | null
          id: number
          method: string | null
          resource_type: string | null
          source: string | null
          status_code: number | null
          tab_url: string | null
          url: string
        }
        Insert: {
          captured_at?: string | null
          duration_ms?: number | null
          host?: string | null
          id?: number
          method?: string | null
          resource_type?: string | null
          source?: string | null
          status_code?: number | null
          tab_url?: string | null
          url: string
        }
        Update: {
          captured_at?: string | null
          duration_ms?: number | null
          host?: string | null
          id?: number
          method?: string | null
          resource_type?: string | null
          source?: string | null
          status_code?: number | null
          tab_url?: string | null
          url?: string
        }
        Relationships: []
      }
      api_keys_detected: {
        Row: {
          captured_at: string | null
          id: number
          pattern_name: string
          redacted_preview: string
          source_header: string | null
          source_url: string | null
        }
        Insert: {
          captured_at?: string | null
          id?: number
          pattern_name: string
          redacted_preview: string
          source_header?: string | null
          source_url?: string | null
        }
        Update: {
          captured_at?: string | null
          id?: number
          pattern_name?: string
          redacted_preview?: string
          source_header?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: number
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: never
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: never
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          icon: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string
          icon?: string
          id: string
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      execution_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_msg: string | null
          estimated_cost: string | null
          fallback_for: string | null
          id: number
          latency_class: string | null
          output_data: Json | null
          output_summary: string | null
          parallel_group: number | null
          reason: string | null
          requires_auth: boolean | null
          sequence_order: number | null
          session_id: string
          skill_id: string
          skill_name: string
          started_at: string | null
          status: string | null
          stream_chunks: string | null
          tokens_used: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_msg?: string | null
          estimated_cost?: string | null
          fallback_for?: string | null
          id?: never
          latency_class?: string | null
          output_data?: Json | null
          output_summary?: string | null
          parallel_group?: number | null
          reason?: string | null
          requires_auth?: boolean | null
          sequence_order?: number | null
          session_id: string
          skill_id: string
          skill_name: string
          started_at?: string | null
          status?: string | null
          stream_chunks?: string | null
          tokens_used?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_msg?: string | null
          estimated_cost?: string | null
          fallback_for?: string | null
          id?: never
          latency_class?: string | null
          output_data?: Json | null
          output_summary?: string | null
          parallel_group?: number | null
          reason?: string | null
          requires_auth?: boolean | null
          sequence_order?: number | null
          session_id?: string
          skill_id?: string
          skill_name?: string
          started_at?: string | null
          status?: string | null
          stream_chunks?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_pages: {
        Row: {
          built_in: boolean | null
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          icon: string | null
          id: string
          label: string
          path: string
          sort_order: number | null
          source_url: string | null
        }
        Insert: {
          built_in?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          icon?: string | null
          id: string
          label: string
          path: string
          sort_order?: number | null
          source_url?: string | null
        }
        Update: {
          built_in?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          icon?: string | null
          id?: string
          label?: string
          path?: string
          sort_order?: number | null
          source_url?: string | null
        }
        Relationships: []
      }
      memories: {
        Row: {
          access_count: number | null
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          importance: number | null
          last_accessed: string | null
          session_id: string | null
          source: string | null
          tags: Json | null
        }
        Insert: {
          access_count?: number | null
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          last_accessed?: string | null
          session_id?: string | null
          source?: string | null
          tags?: Json | null
        }
        Update: {
          access_count?: number | null
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          last_accessed?: string | null
          session_id?: string | null
          source?: string | null
          tags?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_invocations: {
        Row: {
          callback_attempts: number
          callback_delivered: boolean
          callback_last_at: string | null
          callback_last_response: string | null
          callback_last_status: number | null
          callback_url: string | null
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          request_id: string
          skill: string
          status: string
        }
        Insert: {
          callback_attempts?: number
          callback_delivered?: boolean
          callback_last_at?: string | null
          callback_last_response?: string | null
          callback_last_status?: number | null
          callback_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          request_id: string
          skill: string
          status?: string
        }
        Update: {
          callback_attempts?: number
          callback_delivered?: boolean
          callback_last_at?: string | null
          callback_last_response?: string | null
          callback_last_status?: number | null
          callback_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          request_id?: string
          skill?: string
          status?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          block_conditions: Json | null
          boundary: string | null
          category_id: string
          cost_class: string | null
          created_at: string | null
          description: string | null
          fallback_chain: Json | null
          id: string
          inputs: Json | null
          invoke_conditions: Json | null
          latency_class: string | null
          logs_required: boolean | null
          name: string
          outputs: Json | null
          priority: number | null
          requires_auth: boolean | null
          requires_freshness: boolean | null
          safe_for_parallel: boolean | null
          stateful: boolean | null
          tool_definition: Json | null
          trigger_condition: string | null
          updated_at: string | null
        }
        Insert: {
          block_conditions?: Json | null
          boundary?: string | null
          category_id: string
          cost_class?: string | null
          created_at?: string | null
          description?: string | null
          fallback_chain?: Json | null
          id: string
          inputs?: Json | null
          invoke_conditions?: Json | null
          latency_class?: string | null
          logs_required?: boolean | null
          name: string
          outputs?: Json | null
          priority?: number | null
          requires_auth?: boolean | null
          requires_freshness?: boolean | null
          safe_for_parallel?: boolean | null
          stateful?: boolean | null
          tool_definition?: Json | null
          trigger_condition?: string | null
          updated_at?: string | null
        }
        Update: {
          block_conditions?: Json | null
          boundary?: string | null
          category_id?: string
          cost_class?: string | null
          created_at?: string | null
          description?: string | null
          fallback_chain?: Json | null
          id?: string
          inputs?: Json | null
          invoke_conditions?: Json | null
          latency_class?: string | null
          logs_required?: boolean | null
          name?: string
          outputs?: Json | null
          priority?: number | null
          requires_auth?: boolean | null
          requires_freshness?: boolean | null
          safe_for_parallel?: boolean | null
          stateful?: boolean | null
          tool_definition?: Json | null
          trigger_condition?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      claim_admin_if_unclaimed: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      run_rls_regression: {
        Args: never
        Returns: {
          detail: string
          passed: boolean
          test_name: string
        }[]
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
