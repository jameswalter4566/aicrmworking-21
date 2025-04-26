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
      call_logs: {
        Row: {
          created_at: string
          duration: number | null
          from_number: string | null
          id: string
          line_number: number
          sid: string
          status: string
          timestamp: string
          to_number: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          from_number?: string | null
          id?: string
          line_number: number
          sid: string
          status: string
          timestamp?: string
          to_number?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          from_number?: string | null
          id?: string
          line_number?: number
          sid?: string
          status?: string
          timestamp?: string
          to_number?: string | null
        }
        Relationships: []
      }
      call_mappings: {
        Row: {
          browser_call_sid: string | null
          call_sid: string
          created_at: string | null
          id: string
          lead_details: Json | null
          lead_id: string
          original_lead_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          browser_call_sid?: string | null
          call_sid: string
          created_at?: string | null
          id?: string
          lead_details?: Json | null
          lead_id: string
          original_lead_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          browser_call_sid?: string | null
          call_sid?: string
          created_at?: string | null
          id?: string
          lead_details?: Json | null
          lead_id?: string
          original_lead_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      call_status_updates: {
        Row: {
          call_sid: string
          created_at: string
          data: Json
          id: string
          session_id: string
          status: string
          timestamp: string
        }
        Insert: {
          call_sid: string
          created_at?: string
          data: Json
          id?: string
          session_id: string
          status: string
          timestamp?: string
        }
        Update: {
          call_sid?: string
          created_at?: string
          data?: Json
          id?: string
          session_id?: string
          status?: string
          timestamp?: string
        }
        Relationships: []
      }
      calling_list_leads: {
        Row: {
          added_at: string
          added_by: string
          id: string
          lead_id: number
          list_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          id?: string
          lead_id: number
          list_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          id?: string
          lead_id?: number
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calling_list_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calling_list_leads_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "calling_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      calling_lists: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_portal_access: {
        Row: {
          access_token: string
          created_at: string | null
          created_by: string | null
          id: string
          last_accessed_at: string | null
          lead_id: number | null
          portal_slug: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          lead_id?: number | null
          portal_slug: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_accessed_at?: string | null
          lead_id?: number | null
          portal_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          accent_color: string | null
          company_name: string | null
          created_at: string | null
          id: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dialing_session_leads: {
        Row: {
          attempt_count: number | null
          created_at: string
          disposition: string | null
          id: string
          last_attempt: string | null
          lead_id: string
          notes: string | null
          priority: number | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          disposition?: string | null
          id?: string
          last_attempt?: string | null
          lead_id: string
          notes?: string | null
          priority?: number | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          disposition?: string | null
          id?: string
          last_attempt?: string | null
          lead_id?: string
          notes?: string | null
          priority?: number | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialing_session_leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dialing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dialing_sessions: {
        Row: {
          attempted_leads: number | null
          calling_list_id: string
          completed_leads: number | null
          created_at: string
          created_by: string
          end_time: string | null
          id: string
          name: string
          start_time: string | null
          status: Database["public"]["Enums"]["dialing_session_status"]
          total_leads: number | null
          updated_at: string
        }
        Insert: {
          attempted_leads?: number | null
          calling_list_id: string
          completed_leads?: number | null
          created_at?: string
          created_by: string
          end_time?: string | null
          id?: string
          name: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["dialing_session_status"]
          total_leads?: number | null
          updated_at?: string
        }
        Update: {
          attempted_leads?: number | null
          calling_list_id?: string
          completed_leads?: number | null
          created_at?: string
          created_by?: string
          end_time?: string | null
          id?: string
          name?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["dialing_session_status"]
          total_leads?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialing_sessions_calling_list_id_fkey"
            columns: ["calling_list_id"]
            isOneToOne: false
            referencedRelation: "calling_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      document_files: {
        Row: {
          category: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: number
          lead_id: string
          original_name: string
          subcategory: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: number
          lead_id: string
          original_name: string
          subcategory: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: number
          lead_id?: string
          original_name?: string
          subcategory?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      docusign_envelopes: {
        Row: {
          condition_id: string
          created_at: string | null
          document_name: string | null
          document_url: string | null
          envelope_id: string
          id: string
          lead_id: string
          signed_document_url: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          condition_id: string
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          envelope_id: string
          id?: string
          lead_id: string
          signed_document_url?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          condition_id?: string
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          envelope_id?: string
          id?: string
          lead_id?: string
          signed_document_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
          added_to_pipeline_at: string | null
          avatar: string | null
          created_at: string | null
          created_by: string | null
          disposition: string | null
          email: string | null
          first_name: string | null
          id: number
          is_mortgage_lead: boolean | null
          last_name: string | null
          mailing_address: string | null
          mortgage_data: Json | null
          phone1: string | null
          phone2: string | null
          property_address: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          added_to_pipeline_at?: string | null
          avatar?: string | null
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          email?: string | null
          first_name?: string | null
          id: number
          is_mortgage_lead?: boolean | null
          last_name?: string | null
          mailing_address?: string | null
          mortgage_data?: Json | null
          phone1?: string | null
          phone2?: string | null
          property_address?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          added_to_pipeline_at?: string | null
          avatar?: string | null
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          is_mortgage_lead?: boolean | null
          last_name?: string | null
          mailing_address?: string | null
          mortgage_data?: Json | null
          phone1?: string | null
          phone2?: string | null
          property_address?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      loan_conditions: {
        Row: {
          conditions_data: Json
          created_at: string
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          conditions_data: Json
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          conditions_data?: Json
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mortgage_deals: {
        Row: {
          closing_date: string | null
          created_at: string | null
          created_by: string | null
          disposition: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          lead_id: number | null
          mailing_address: string | null
          mortgage_data: Json | null
          phone1: string | null
          phone2: string | null
          probability: number | null
          property_address: string | null
          stage: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          closing_date?: string | null
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lead_id?: number | null
          mailing_address?: string | null
          mortgage_data?: Json | null
          phone1?: string | null
          phone2?: string | null
          probability?: number | null
          property_address?: string | null
          stage?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          closing_date?: string | null
          created_at?: string | null
          created_by?: string | null
          disposition?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lead_id?: number | null
          mailing_address?: string | null
          mortgage_data?: Json | null
          phone1?: string | null
          phone2?: string | null
          probability?: number | null
          property_address?: string | null
          stage?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_decks: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          lead_id: string | null
          mortgage_data: Json | null
          slug: string | null
          template_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          mortgage_data?: Json | null
          slug?: string | null
          template_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          mortgage_data?: Json | null
          slug?: string | null
          template_type?: string | null
          title?: string
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
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
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
      processed_gmail_attachments: {
        Row: {
          attachment_id: string
          email_id: string
          id: string
          lead_id: string
          processed_at: string | null
          success: boolean | null
        }
        Insert: {
          attachment_id: string
          email_id: string
          id?: string
          lead_id: string
          processed_at?: string | null
          success?: boolean | null
        }
        Update: {
          attachment_id?: string
          email_id?: string
          id?: string
          lead_id?: string
          processed_at?: string | null
          success?: boolean | null
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
          phone_number: string | null
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
          phone_number?: string | null
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
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_webhooks: {
        Row: {
          ai_response: string | null
          id: string
          message_hash: string | null
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          received_at: string
          request_id: string | null
          webhook_data: Json
        }
        Insert: {
          ai_response?: string | null
          id?: string
          message_hash?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          request_id?: string | null
          webhook_data: Json
        }
        Update: {
          ai_response?: string | null
          id?: string
          message_hash?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          request_id?: string | null
          webhook_data?: Json
        }
        Relationships: []
      }
      user_email_connections: {
        Row: {
          access_token: string
          created_at: string
          email: string
          expires_at: string
          id: string
          provider: string
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          provider: string
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      session_queue_stats: {
        Row: {
          completed_count: number | null
          in_progress_count: number | null
          queued_count: number | null
          session_id: string | null
          total_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      find_lead_by_string_id: {
        Args: { lead_string_id: string }
        Returns: {
          id: number
          phone1: string
        }[]
      }
      get_next_session_lead: {
        Args: { p_session_id: string }
        Returns: {
          id: string
          lead_id: string
          session_id: string
          status: string
          priority: number
          attempt_count: number
          notes: string
        }[]
      }
    }
    Enums: {
      dialing_session_status: "active" | "paused" | "completed"
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
    Enums: {
      dialing_session_status: ["active", "paused", "completed"],
    },
  },
} as const
