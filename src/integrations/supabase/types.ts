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
