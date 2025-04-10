export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      lead_activities: {
        Row: {
          description: string
          id: string
          lead_id: number
          timestamp: string
          type: string
        }
        Insert: {
          description: string
          id?: string
          lead_id: number
          timestamp?: string
          type: string
        }
        Update: {
          description?: string
          id?: string
          lead_id?: number
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          avatar: string | null
          created_at: string | null
          created_by: string | null
          disposition: string | null
          email: string | null
          first_name: string | null
          id: number
          last_name: string | null
          mailing_address: string | null
          phone1: string | null
          phone2: string | null
          property_address: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          email?: string | null
          first_name?: string | null
          id: number
          last_name?: string | null
          mailing_address?: string | null
          phone1?: string | null
          phone2?: string | null
          property_address?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          last_name?: string | null
          mailing_address?: string | null
          phone1?: string | null
          phone2?: string | null
          property_address?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      power_dialer_agents: {
        Row: {
          created_at: string | null
          current_call_id: string | null
          id: string
          last_status_change: string | null
          name: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_call_id?: string | null
          id?: string
          last_status_change?: string | null
          name: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_call_id?: string | null
          id?: string
          last_status_change?: string | null
          name?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "power_dialer_agents_current_call_id_fkey"
            columns: ["current_call_id"]
            isOneToOne: false
            referencedRelation: "power_dialer_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      power_dialer_call_queue: {
        Row: {
          assigned_to_agent_id: string | null
          call_id: string
          created_at: string | null
          created_timestamp: string | null
          id: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_agent_id?: string | null
          call_id: string
          created_at?: string | null
          created_timestamp?: string | null
          id?: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_agent_id?: string | null
          call_id?: string
          created_at?: string | null
          created_timestamp?: string | null
          id?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "power_dialer_call_queue_assigned_to_agent_id_fkey"
            columns: ["assigned_to_agent_id"]
            isOneToOne: false
            referencedRelation: "power_dialer_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_dialer_call_queue_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "power_dialer_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      power_dialer_calls: {
        Row: {
          agent_id: string | null
          contact_id: string | null
          created_at: string | null
          duration: number | null
          end_timestamp: string | null
          id: string
          machine_detection_result: string | null
          start_timestamp: string | null
          status: string
          twilio_call_sid: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration?: number | null
          end_timestamp?: string | null
          id?: string
          machine_detection_result?: string | null
          start_timestamp?: string | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration?: number | null
          end_timestamp?: string | null
          id?: string
          machine_detection_result?: string | null
          start_timestamp?: string | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "power_dialer_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "power_dialer_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_dialer_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "power_dialer_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      power_dialer_contacts: {
        Row: {
          created_at: string | null
          id: string
          last_call_timestamp: string | null
          name: string
          notes: string | null
          phone_number: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_call_timestamp?: string | null
          name: string
          notes?: string | null
          phone_number: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_call_timestamp?: string | null
          name?: string
          notes?: string | null
          phone_number?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      predictive_dialer_agents: {
        Row: {
          created_at: string | null
          current_call_id: string | null
          id: string
          last_status_change: string | null
          name: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_call_id?: string | null
          id?: string
          last_status_change?: string | null
          name: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_call_id?: string | null
          id?: string
          last_status_change?: string | null
          name?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_predictive_dialer_agents_current_call"
            columns: ["current_call_id"]
            isOneToOne: false
            referencedRelation: "predictive_dialer_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_dialer_call_queue: {
        Row: {
          assigned_to_agent_id: string | null
          call_id: string
          created_at: string | null
          created_timestamp: string | null
          id: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_agent_id?: string | null
          call_id: string
          created_at?: string | null
          created_timestamp?: string | null
          id?: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_agent_id?: string | null
          call_id?: string
          created_at?: string | null
          created_timestamp?: string | null
          id?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_dialer_call_queue_assigned_to_agent_id_fkey"
            columns: ["assigned_to_agent_id"]
            isOneToOne: false
            referencedRelation: "predictive_dialer_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_dialer_call_queue_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "predictive_dialer_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_dialer_calls: {
        Row: {
          agent_id: string | null
          contact_id: string | null
          created_at: string | null
          duration: number | null
          end_timestamp: string | null
          id: string
          machine_detection_result: string | null
          start_timestamp: string | null
          status: string
          twilio_call_sid: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration?: number | null
          end_timestamp?: string | null
          id?: string
          machine_detection_result?: string | null
          start_timestamp?: string | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration?: number | null
          end_timestamp?: string | null
          id?: string
          machine_detection_result?: string | null
          start_timestamp?: string | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_dialer_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "predictive_dialer_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_dialer_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "predictive_dialer_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_dialer_contacts: {
        Row: {
          created_at: string | null
          id: string
          last_call_timestamp: string | null
          name: string
          notes: string | null
          phone_number: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_call_timestamp?: string | null
          name: string
          notes?: string | null
          phone_number: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_call_timestamp?: string | null
          name?: string
          notes?: string | null
          phone_number?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
